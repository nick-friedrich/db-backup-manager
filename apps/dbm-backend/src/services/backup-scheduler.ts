import { eq } from "drizzle-orm";
import { db } from "../db";
import { backupSchedule, backupConnection, backupFile } from "@packages/dbschema/dbm";
import { executeBackup } from "./backup-executor";

interface ScheduledJob {
  scheduleId: string;
  timeout: Timer;
}

class BackupScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();

  async initialize() {
    console.log("Initializing backup scheduler...");
    
    // Load all active schedules from database
    const activeSchedules = await db
      .select({
        id: backupSchedule.id,
        cronExpression: backupSchedule.cronExpression,
        connectionId: backupSchedule.connectionId,
        nextRunAt: backupSchedule.nextRunAt,
        isActive: backupSchedule.isActive
      })
      .from(backupSchedule)
      .where(eq(backupSchedule.isActive, true));

    // Schedule each active backup
    for (const schedule of activeSchedules) {
      await this.scheduleBackup(schedule.id);
    }

    console.log(`Initialized ${activeSchedules.length} backup schedules`);
  }

  async scheduleBackup(scheduleId: string) {
    // Cancel existing job if it exists
    this.cancelJob(scheduleId);

    // Get schedule details
    const [schedule] = await db
      .select()
      .from(backupSchedule)
      .where(eq(backupSchedule.id, scheduleId));

    if (!schedule || !schedule.isActive) {
      return;
    }

    // Calculate next run time based on cron expression
    const nextRunTime = this.calculateNextRun(schedule.cronExpression);
    const delay = nextRunTime.getTime() - Date.now();

    if (delay <= 0) {
      // Run immediately and schedule next
      await this.executeScheduledBackup(scheduleId);
      return;
    }

    // Schedule the backup
    const timeout = setTimeout(async () => {
      await this.executeScheduledBackup(scheduleId);
    }, delay);

    this.jobs.set(scheduleId, {
      scheduleId,
      timeout
    });

    // Update next run time in database
    await db
      .update(backupSchedule)
      .set({ nextRunAt: nextRunTime })
      .where(eq(backupSchedule.id, scheduleId));

    console.log(`Scheduled backup ${scheduleId} for ${nextRunTime.toISOString()}`);
  }

  async executeScheduledBackup(scheduleId: string) {
    try {
      console.log(`Executing scheduled backup: ${scheduleId}`);

      // Get schedule and connection details
      const [schedule] = await db
        .select({
          id: backupSchedule.id,
          name: backupSchedule.name,
          connectionId: backupSchedule.connectionId,
          cronExpression: backupSchedule.cronExpression,
          userId: backupSchedule.userId
        })
        .from(backupSchedule)
        .where(eq(backupSchedule.id, scheduleId));

      if (!schedule) {
        console.error(`Schedule not found: ${scheduleId}`);
        return;
      }

      const [connection] = await db
        .select()
        .from(backupConnection)
        .where(eq(backupConnection.id, schedule.connectionId));

      if (!connection) {
        console.error(`Connection not found for schedule: ${scheduleId}`);
        return;
      }

      // Update last run time
      await db
        .update(backupSchedule)
        .set({ lastRunAt: new Date() })
        .where(eq(backupSchedule.id, scheduleId));

      // Create backup file record
      const backupFileId = crypto.randomUUID();
      const fileName = `backup_${connection.name}_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
      
      await db
        .insert(backupFile)
        .values({
          id: backupFileId,
          fileName,
          filePath: `./backups/${fileName}`,
          fileSizeBytes: 0,
          status: 'pending',
          scheduleId: schedule.id,
          userId: schedule.userId
        });

      // Execute the backup
      const result = await executeBackup(connection, fileName);

      // Update backup file record with results
      await db
        .update(backupFile)
        .set({
          status: result.success ? 'completed' : 'failed',
          fileSizeBytes: result.fileSize || 0,
          errorMessage: result.error,
          completedAt: new Date()
        })
        .where(eq(backupFile.id, backupFileId));

      console.log(`Backup ${scheduleId} ${result.success ? 'completed' : 'failed'}`);

    } catch (error) {
      console.error(`Error executing backup ${scheduleId}:`, error);
    } finally {
      // Schedule next run
      await this.scheduleBackup(scheduleId);
    }
  }

  cancelJob(scheduleId: string) {
    const job = this.jobs.get(scheduleId);
    if (job) {
      clearTimeout(job.timeout);
      this.jobs.delete(scheduleId);
      console.log(`Cancelled backup job: ${scheduleId}`);
    }
  }

  async cancelSchedule(scheduleId: string) {
    this.cancelJob(scheduleId);
    
    // Mark schedule as inactive
    await db
      .update(backupSchedule)
      .set({ isActive: false })
      .where(eq(backupSchedule.id, scheduleId));
  }

  // Simple cron parser for basic expressions like "0 2 * * *" (daily at 2am)
  private calculateNextRun(cronExpression: string): Date {
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression');
    }

    const [minute, hour, _dayOfMonth, _month, _dayOfWeek] = parts;
    const now = new Date();
    const next = new Date(now);

    // Handle simple cases for now
    if (minute !== '*' && hour !== '*') {
      next.setHours(parseInt(hour), parseInt(minute), 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
    } else {
      // Default to next hour for complex expressions
      next.setHours(next.getHours() + 1, 0, 0, 0);
    }

    return next;
  }
}

export const backupScheduler = new BackupScheduler();