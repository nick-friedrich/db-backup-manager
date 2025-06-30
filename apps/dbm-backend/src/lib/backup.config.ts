import path from "node:path";
import { homedir } from "node:os";

export const dbPath =
  process.env.DATABASE_URL ||
  path.join(homedir(), ".config", "dbm", "db.sqlite");

export const backupDirectory =
  process.env.BACKUP_STORAGE_PATH ||
  path.join(homedir(), ".config", "dbm", "backups");
