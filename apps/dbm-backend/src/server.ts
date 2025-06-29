import { Elysia } from "elysia";
import "dotenv/config";
import { cors } from '@elysiajs/cors'
import { authPlugin } from "./lib/auth-plugin";
import { blogController } from "./controller/blog_controller";
import { connectionController } from "./controller/database_backupmanager/connection_controller";
import { scheduleController } from "./controller/database_backupmanager/schedule_controller";
import { backupController } from "./controller/database_backupmanager/backup_controller";
import { importExportController } from "./controller/database_backupmanager/import_export_controller";
import { backupScheduler } from "./services/backup-scheduler";

const app = new Elysia()
  .use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
    // exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length']
  }))
  .get("/", () => "Hello Database Backup Manager")
  .use(authPlugin)
  .use(blogController)
  .use(connectionController)
  .use(scheduleController)
  .use(backupController)
  .use(importExportController)
  .get("/user", ({ user }) => user, {
    auth: true
  })
  .get("/protected", ({ user }) => {
    return {
      message: "Protected route",
      user,
    };
  }, {
    auth: true
  })
  .listen(3000);

// Initialize backup scheduler
backupScheduler.initialize();

export type App = typeof app

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
