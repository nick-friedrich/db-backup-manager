import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { homedir } from "os";
import { join, dirname } from "path";
import { mkdirSync, existsSync } from "fs";
import { dbPath } from "./src/lib/backup.config";

if (!process.env.DATABASE_URL) {
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || `file:${dbPath}`,
  },
});
