import { Elysia, t } from "elysia";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../../db";
import { backupFile, backupSchedule, backupConnection } from "@packages/sqlite_schema/dbm";
import { unlink } from "node:fs/promises";
import { authPlugin } from "../../lib/auth-plugin";

export const backupController = new Elysia({ prefix: "/backups" })
  .use(authPlugin)
  .get("/", async ({ user, query }) => {
    const limit = query.limit ? parseInt(query.limit) : 50;
    const offset = query.offset ? parseInt(query.offset) : 0;

    const backups = await db
      .select({
        id: backupFile.id,
        fileName: backupFile.fileName,
        filePath: backupFile.filePath,
        fileSizeBytes: backupFile.fileSizeBytes,
        status: backupFile.status,
        errorMessage: backupFile.errorMessage,
        startedAt: backupFile.startedAt,
        completedAt: backupFile.completedAt,
        createdAt: backupFile.createdAt,
        scheduleName: backupSchedule.name,
        connectionName: backupConnection.name,
        postgresqlVersion: backupConnection.postgresqlVersion
      })
      .from(backupFile)
      .leftJoin(backupSchedule, eq(backupFile.scheduleId, backupSchedule.id))
      .leftJoin(backupConnection, eq(backupSchedule.connectionId, backupConnection.id))
      .where(eq(backupFile.userId, user.id))
      .orderBy(desc(backupFile.createdAt))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: backupFile.id })
      .from(backupFile)
      .where(eq(backupFile.userId, user.id));

    return {
      backups,
      pagination: {
        total: total.length,
        limit,
        offset
      }
    };
  }, {
    auth: true,
    query: t.Object({
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String())
    })
  })

  .get("/:id", async ({ params, user }) => {
    const [backup] = await db
      .select({
        id: backupFile.id,
        fileName: backupFile.fileName,
        filePath: backupFile.filePath,
        fileSizeBytes: backupFile.fileSizeBytes,
        status: backupFile.status,
        errorMessage: backupFile.errorMessage,
        startedAt: backupFile.startedAt,
        completedAt: backupFile.completedAt,
        createdAt: backupFile.createdAt,
        scheduleName: backupSchedule.name,
        connectionName: backupConnection.name,
        postgresqlVersion: backupConnection.postgresqlVersion
      })
      .from(backupFile)
      .leftJoin(backupSchedule, eq(backupFile.scheduleId, backupSchedule.id))
      .leftJoin(backupConnection, eq(backupSchedule.connectionId, backupConnection.id))
      .where(
        and(
          eq(backupFile.id, params.id),
          eq(backupFile.userId, user.id)
        )
      );

    if (!backup) {
      throw new Error("Backup not found");
    }

    return { backup };
  }, {
    auth: true,
    params: t.Object({
      id: t.String()
    })
  })

  .get("/:id/download", async ({ params, user, set }) => {
    const [backup] = await db
      .select()
      .from(backupFile)
      .where(
        and(
          eq(backupFile.id, params.id),
          eq(backupFile.userId, user.id)
        )
      );

    if (!backup) {
      set.status = 404;
      return { error: "Backup not found" };
    }

    if (backup.status !== 'completed') {
      set.status = 400;
      return { error: "Backup is not completed" };
    }

    try {
      const file = Bun.file(backup.filePath);
      const exists = await file.exists();

      if (!exists) {
        set.status = 404;
        return { error: "Backup file not found on disk" };
      }

      // Set proper headers for file download
      set.headers = {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${backup.fileName}"`,
        'Content-Length': backup.fileSizeBytes.toString()
      };

      // Return the file directly, let Elysia handle CORS
      return file;
    } catch (_error) {
      set.status = 500;
      return { error: "Failed to read backup file" };
    }
  }, {
    auth: true,
    params: t.Object({
      id: t.String()
    })
  })

  .delete("/:id", async ({ params, user }) => {
    const [backup] = await db
      .select()
      .from(backupFile)
      .where(
        and(
          eq(backupFile.id, params.id),
          eq(backupFile.userId, user.id)
        )
      );

    if (!backup) {
      throw new Error("Backup not found");
    }

    try {
      // Delete the file from filesystem
      await unlink(backup.filePath);
    } catch (error) {
      console.warn(`Failed to delete backup file: ${backup.filePath}`, error);
    }

    // Delete record from database
    await db
      .delete(backupFile)
      .where(eq(backupFile.id, params.id));

    return { message: "Backup deleted successfully" };
  }, {
    auth: true,
    params: t.Object({
      id: t.String()
    })
  })

  .get("/stats/summary", async ({ user }) => {
    // Get backup stats
    const totalBackups = await db
      .select({ count: backupFile.id })
      .from(backupFile)
      .where(eq(backupFile.userId, user.id));

    const completedBackups = await db
      .select({ count: backupFile.id })
      .from(backupFile)
      .where(
        and(
          eq(backupFile.userId, user.id),
          eq(backupFile.status, 'completed')
        )
      );

    const failedBackups = await db
      .select({ count: backupFile.id })
      .from(backupFile)
      .where(
        and(
          eq(backupFile.userId, user.id),
          eq(backupFile.status, 'failed')
        )
      );

    // Calculate total storage used
    const storageResult = await db
      .select({ totalSize: backupFile.fileSizeBytes })
      .from(backupFile)
      .where(
        and(
          eq(backupFile.userId, user.id),
          eq(backupFile.status, 'completed')
        )
      );

    const totalStorageBytes = storageResult.reduce((sum, backup) => sum + (backup.totalSize || 0), 0);

    return {
      stats: {
        totalBackups: totalBackups.length,
        completedBackups: completedBackups.length,
        failedBackups: failedBackups.length,
        totalStorageBytes,
        totalStorageMB: Math.round(totalStorageBytes / (1024 * 1024) * 100) / 100
      }
    };
  }, {
    auth: true
  });