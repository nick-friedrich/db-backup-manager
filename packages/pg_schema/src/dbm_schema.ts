import { text, timestamp, boolean, integer, pgTable } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Import user from auth schema for relations
import { user } from "@packages/dbschema/auth";

// Backup Manager Schema
// export const backupSchema = pgSchema("public");

// Database Connections Table
export const backupConnection = pgTable("backup_connection", {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'mysql', 'postgresql', 'sqlite', 'mongodb'
  host: text('host').notNull(),
  port: integer('port').notNull(),
  database: text('database').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(), // Should be encrypted in production
  postgresqlVersion: text('postgresql_version'), // Major version like '12', '14', '16', '17'
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })
});

// Backup Schedules Table
export const backupSchedule = pgTable("backup_schedule", {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  cronExpression: text('cron_expression').notNull(), // '0 2 * * *' (daily at 2am)
  timezone: text('timezone').default('UTC').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).notNull(),
  connectionId: text('connection_id').notNull().references(() => backupConnection.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })
});

// Backup Files Table
export const backupFile = pgTable("backup_file", {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  status: text('status').notNull(), // 'pending', 'completed', 'failed'
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at').$defaultFn(() => new Date()).notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()).notNull(),
  scheduleId: text('schedule_id').notNull().references(() => backupSchedule.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })
});

// RELATIONS
export const userRelations = relations(user, ({ many }) => ({
  backupConnections: many(backupConnection),
  backupSchedules: many(backupSchedule),
  backupFiles: many(backupFile),
}));

export const backupConnectionRelations = relations(backupConnection, ({ one, many }) => ({
  user: one(user, {
    fields: [backupConnection.userId],
    references: [user.id],
  }),
  schedules: many(backupSchedule),
}));

export const backupScheduleRelations = relations(backupSchedule, ({ one, many }) => ({
  user: one(user, {
    fields: [backupSchedule.userId],
    references: [user.id],
  }),
  connection: one(backupConnection, {
    fields: [backupSchedule.connectionId],
    references: [backupConnection.id],
  }),
  files: many(backupFile),
}));

export const backupFileRelations = relations(backupFile, ({ one }) => ({
  user: one(user, {
    fields: [backupFile.userId],
    references: [user.id],
  }),
  schedule: one(backupSchedule, {
    fields: [backupFile.scheduleId],
    references: [backupSchedule.id],
  }),
}));


