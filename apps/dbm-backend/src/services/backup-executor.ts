import { mkdir } from "node:fs/promises";
import path, { join } from "node:path";
import { backupDirectory } from "../lib/backup.config";

interface BackupConnection {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  postgresqlVersion?: string | null;
}

interface BackupResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  error?: string;
}

export async function executeBackup(connection: BackupConnection, fileName: string): Promise<BackupResult> {
  try {
    // Ensure backup directory exists
    const backupDir = backupDirectory;
    await mkdir(backupDir, { recursive: true });

    const filePath = join(backupDir, fileName);

    if (connection.type === "postgresql") {
      return await executePostgreSQLBackup(connection, filePath);
    } else {
      return {
        success: false,
        error: `Database type ${connection.type} not supported yet`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

async function executePostgreSQLBackup(connection: BackupConnection, filePath: string): Promise<BackupResult> {
  try {
    // Check if Docker is available
    const dockerAvailable = await checkDockerAvailability();

    if (!dockerAvailable) {
      console.warn("Docker not available, falling back to system pg_dump");
      return await executeSystemPgDump(connection, filePath);
    }

    // Use Docker-based pg_dump with version-specific image
    return await executeDockerPgDump(connection, filePath);
  } catch (error) {
    console.error("PostgreSQL backup error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

async function checkDockerAvailability(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["docker", "--version"], {
      stdout: "pipe",
      stderr: "pipe"
    });

    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch (_error) {
    return false;
  }
}

async function executeDockerPgDump(connection: BackupConnection, filePath: string): Promise<BackupResult> {
  try {
    // Determine PostgreSQL version for Docker image
    const pgVersion = connection.postgresqlVersion || "16"; // Default to 16 if not detected
    const dockerImage = `postgres:${pgVersion}`;

    // Create absolute path for the backup file (Docker needs absolute paths for volume mounts)
    const absoluteFilePath = path.resolve(filePath);
    const backupFileName = path.basename(absoluteFilePath);
    const backupDir = path.dirname(absoluteFilePath);

    console.log(`Starting Docker PostgreSQL backup: ${connection.name} using ${dockerImage}`);

    // Docker command to run pg_dump
    const args = [
      "docker", "run", "--rm",
      "-v", `${backupDir}:/backups`,
      "-e", `PGPASSWORD=${connection.password}`,
      dockerImage,
      "pg_dump",
      `--host=${connection.host}`,
      `--port=${connection.port}`,
      `--username=${connection.username}`,
      `--dbname=${connection.database}`,
      "--verbose",
      "--clean",
      "--no-owner",
      "--no-privileges",
      `--file=/backups/${backupFileName}`
    ];

    console.log(`Docker command: ${args.join(" ")}`);

    // Execute Docker pg_dump
    const proc = Bun.spawn(args, {
      stdout: "pipe",
      stderr: "pipe"
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      // Get file size
      const file = Bun.file(absoluteFilePath);
      const fileSize = file.size;

      console.log(`Docker PostgreSQL backup completed: ${absoluteFilePath} (${fileSize} bytes)`);

      return {
        success: true,
        filePath: absoluteFilePath,
        fileSize
      };
    } else {
      const stderr = await new Response(proc.stderr).text();
      console.error(`Docker PostgreSQL backup failed: ${stderr}`);

      return {
        success: false,
        error: `Docker pg_dump failed with exit code ${exitCode}: ${stderr}`
      };
    }
  } catch (error) {
    console.error("Docker PostgreSQL backup error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Docker backup failed"
    };
  }
}

async function executeSystemPgDump(connection: BackupConnection, filePath: string): Promise<BackupResult> {
  try {
    // Build pg_dump command (fallback to system pg_dump)
    const args = [
      "pg_dump",
      `--host=${connection.host}`,
      `--port=${connection.port}`,
      `--username=${connection.username}`,
      `--dbname=${connection.database}`,
      "--verbose",
      "--clean",
      "--no-owner",
      "--no-privileges",
      `--file=${filePath}`
    ];

    // Set environment variables for authentication
    // Filter process.env to only include string values
    const filteredEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value === 'string') {
        filteredEnv[key] = value;
      }
    }

    const env = {
      ...filteredEnv,
      PGPASSWORD: connection.password
    };

    console.log(`Starting system PostgreSQL backup: ${connection.name}`);
    console.log(`Command: ${args.join(" ")}`);

    // Execute pg_dump
    const proc = Bun.spawn(args, {
      env,
      stdout: "pipe",
      stderr: "pipe"
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      // Get file size
      const file = Bun.file(filePath);
      const fileSize = file.size;

      console.log(`System PostgreSQL backup completed: ${filePath} (${fileSize} bytes)`);

      return {
        success: true,
        filePath,
        fileSize
      };
    } else {
      const stderr = await new Response(proc.stderr).text();
      console.error(`System PostgreSQL backup failed: ${stderr}`);

      return {
        success: false,
        error: `pg_dump failed with exit code ${exitCode}: ${stderr}`
      };
    }
  } catch (error) {
    console.error("System PostgreSQL backup error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "System backup failed"
    };
  }
}

export async function testBackup(connection: BackupConnection): Promise<BackupResult> {
  const testFileName = `test_backup_${Date.now()}.sql`;
  const result = await executeBackup(connection, testFileName);

  // Clean up test file if it was created
  if (result.success && result.filePath) {
    try {
      await Bun.$`rm -f ${result.filePath}`;
    } catch (error) {
      console.warn("Failed to clean up test backup file:", error);
    }
  }

  return result;
}