import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { backupConnection, backupSchedule, backupFile } from "@packages/sqlite_schema/dbm";
import { authPlugin } from "../../lib/auth-plugin";
import { backupScheduler } from "../../services/backup-scheduler";
import * as path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { backupDirectory } from "../../lib/backup.config";

export const importExportController = new Elysia({ prefix: "/import-export" })
  .use(authPlugin)
  .get("/export", async ({ user, set }) => {
    try {
      // Get all user's data
      const connections = await db
        .select()
        .from(backupConnection)
        .where(eq(backupConnection.userId, user.id));

      const schedules = await db
        .select()
        .from(backupSchedule)
        .where(eq(backupSchedule.userId, user.id));

      const backups = await db
        .select()
        .from(backupFile)
        .where(eq(backupFile.userId, user.id));

      // Create export data structure
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        userId: user.id,
        data: {
          connections: connections.map(conn => ({
            ...conn,
            // Remove userId from exported data for security
            userId: undefined
          })),
          schedules: schedules.map(schedule => ({
            ...schedule,
            userId: undefined
          })),
          backups: backups.map(backup => ({
            ...backup,
            userId: undefined
          }))
        }
      };

      // Create temp directory for export
      const tempDir = path.join("temp", `export_${user.id}_${Date.now()}`);
      await mkdir(tempDir, { recursive: true });

      // Write metadata
      const metadataPath = path.join(tempDir, "metadata.json");
      await Bun.write(metadataPath, JSON.stringify(exportData, null, 2));

      // Copy backup files
      const backupFilesDir = path.join(tempDir, "backup_files");
      await mkdir(backupFilesDir, { recursive: true });

      for (const backup of backups) {
        if (backup.status === 'completed' && backup.filePath) {
          try {
            const sourceFile = Bun.file(backup.filePath);
            if (await sourceFile.exists()) {
              const targetPath = path.join(backupFilesDir, backup.fileName);
              await Bun.write(targetPath, sourceFile);
            }
          } catch (error) {
            console.warn(`Failed to copy backup file: ${backup.filePath}`, error);
          }
        }
      }

      // Create zip file using Bun's built-in capabilities
      const zipFileName = `dbm_export_${user.id}_${new Date().toISOString().split('T')[0]}.zip`;
      const zipPath = path.join("temp", zipFileName);

      // Use Bun's $ to create zip
      await Bun.$`cd ${tempDir} && zip -r ${path.resolve(zipPath)} .`;

      // Clean up temp directory
      await rm(tempDir, { recursive: true, force: true });

      // Read the zip file
      const zipFile = Bun.file(zipPath);
      const zipSize = (await zipFile.stat()).size;

      // Set response headers
      set.headers = {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
        'Content-Length': zipSize.toString()
      };

      // Clean up zip file after response (in background)
      setTimeout(async () => {
        try {
          await rm(zipPath);
        } catch (error) {
          console.warn(`Failed to cleanup zip file: ${zipPath}`, error);
        }
      }, 1000);

      return zipFile;
    } catch (error) {
      set.status = 500;
      return {
        error: "Export failed",
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }, {
    auth: true
  })

  .post("/import", async ({ user, body, set }) => {
    try {
      const file = body.file;
      if (!file || !(file instanceof File)) {
        set.status = 400;
        return { error: "No file provided" };
      }

      if (!file.name.endsWith('.zip')) {
        set.status = 400;
        return { error: "File must be a ZIP archive" };
      }

      // Create temp directory for extraction
      const tempDir = path.join("temp", `import_${user.id}_${Date.now()}`);
      await mkdir(tempDir, { recursive: true });

      // Save uploaded file
      const uploadPath = path.join(tempDir, "import.zip");
      await Bun.write(uploadPath, file);

      // Extract zip
      await Bun.$`cd ${tempDir} && unzip import.zip`;

      // Read metadata
      const metadataPath = path.join(tempDir, "metadata.json");
      const metadataFile = Bun.file(metadataPath);

      if (!(await metadataFile.exists())) {
        set.status = 400;
        return { error: "Invalid export file: missing metadata" };
      }

      const importData = await metadataFile.json();

      if (!importData.version || !importData.data) {
        set.status = 400;
        return { error: "Invalid export file format" };
      }

      // Track import results
      const results = {
        connections: { imported: 0, skipped: 0, errors: [] as string[] },
        schedules: { imported: 0, skipped: 0, errors: [] as string[] },
        backups: { imported: 0, skipped: 0, errors: [] as string[] }
      };

      // Import connections
      const connectionIdMap = new Map<string, string>();
      for (const conn of importData.data.connections) {
        try {
          const newId = crypto.randomUUID();
          connectionIdMap.set(conn.id, newId);

          await db.insert(backupConnection).values({
            ...conn,
            id: newId,
            userId: user.id,
            createdAt: new Date(conn.createdAt),
            updatedAt: new Date(conn.updatedAt)
          });

          results.connections.imported++;
        } catch (error) {
          results.connections.errors.push(`Failed to import connection "${conn.name}": ${error}`);
        }
      }

      // Import schedules
      const scheduleIdMap = new Map<string, string>();
      for (const schedule of importData.data.schedules) {
        try {
          const newId = crypto.randomUUID();
          const newConnectionId = connectionIdMap.get(schedule.connectionId);

          if (!newConnectionId) {
            results.schedules.errors.push(`Schedule "${schedule.name}" skipped: connection not found`);
            continue;
          }

          scheduleIdMap.set(schedule.id, newId);

          await db.insert(backupSchedule).values({
            ...schedule,
            id: newId,
            connectionId: newConnectionId,
            userId: user.id,
            createdAt: new Date(schedule.createdAt),
            updatedAt: new Date(schedule.updatedAt)
          });

          // Schedule the backup if it's active
          if (schedule.isActive) {
            await backupScheduler.scheduleBackup(newId);
          }

          results.schedules.imported++;
        } catch (error) {
          results.schedules.errors.push(`Failed to import schedule "${schedule.name}": ${error}`);
        }
      }

      // Import backup files and records
      const backupFilesDir = path.join(tempDir, "backup_files");
      const backupFilesDirExists = await Bun.file(backupFilesDir).exists();

      for (const backup of importData.data.backups) {
        try {
          const newId = crypto.randomUUID();
          const newScheduleId = backup.scheduleId ? scheduleIdMap.get(backup.scheduleId) : null;

          // Prepare backup directory
          const backupsDir = backupDirectory;
          await mkdir(backupsDir, { recursive: true });

          let newFilePath = null;

          // Copy backup file if it exists
          if (backup.status === 'completed' && backup.fileName && backupFilesDirExists) {
            const sourceFile = path.join(backupFilesDir, backup.fileName);
            const sourceFileExists = await Bun.file(sourceFile).exists();

            if (sourceFileExists) {
              newFilePath = path.join(backupsDir, backup.fileName);
              await Bun.write(newFilePath, Bun.file(sourceFile));
            }
          }

          await db.insert(backupFile).values({
            ...backup,
            id: newId,
            scheduleId: newScheduleId,
            userId: user.id,
            filePath: newFilePath,
            createdAt: new Date(backup.createdAt),
            startedAt: backup.startedAt ? new Date(backup.startedAt) : null,
            completedAt: backup.completedAt ? new Date(backup.completedAt) : null
          });

          results.backups.imported++;
        } catch (error) {
          results.backups.errors.push(`Failed to import backup "${backup.fileName}": ${error}`);
        }
      }

      // Clean up temp directory
      await rm(tempDir, { recursive: true, force: true });

      return {
        message: "Import completed",
        results
      };
    } catch (error) {
      set.status = 500;
      return {
        error: "Import failed",
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }, {
    auth: true,
    body: t.Object({
      file: t.File()
    })
  });