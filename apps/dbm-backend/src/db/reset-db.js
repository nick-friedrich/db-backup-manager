// Deletes the database and creates a new one

import { rm, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { dbPath } from "../lib/backup.config";

await rm(dbPath, { force: true });
await mkdir(dirname(dbPath), { recursive: true });
