import { drizzle } from "drizzle-orm/libsql";
import { dirname } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { dbPath } from "../lib/backup.config";

const defaultDbPath = dbPath;
const dbUrl = process.env.DATABASE_URL || `file:${defaultDbPath}`;

// Ensure directory exists for SQLite database
if (!process.env.DATABASE_URL) {
  const dbDir = dirname(defaultDbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    console.log(`Created directory ${dbDir}`);
  }
}

export const db = drizzle({
  connection: {
    url: dbUrl,
  },
});
