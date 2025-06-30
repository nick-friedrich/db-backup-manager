import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { backupSchedule, backupConnection } from "@packages/sqlite_schema/dbm";
import { backupScheduler } from "../../services/backup-scheduler";
import { authPlugin } from "../../lib/auth-plugin";

const scheduleSchema = t.Object({
  name: t.String(),
  cronExpression: t.String(),
  timezone: t.Optional(t.String()),
  connectionId: t.String()
});

export const scheduleController = new Elysia({ prefix: "/schedules" })
  .use(authPlugin)
  .get("/", async ({ user }) => {
    const schedules = await db
      .select({
        id: backupSchedule.id,
        name: backupSchedule.name,
        cronExpression: backupSchedule.cronExpression,
        timezone: backupSchedule.timezone,
        isActive: backupSchedule.isActive,
        lastRunAt: backupSchedule.lastRunAt,
        nextRunAt: backupSchedule.nextRunAt,
        createdAt: backupSchedule.createdAt,
        updatedAt: backupSchedule.updatedAt,
        connectionId: backupSchedule.connectionId,
        connectionName: backupConnection.name
      })
      .from(backupSchedule)
      .leftJoin(backupConnection, eq(backupSchedule.connectionId, backupConnection.id))
      .where(eq(backupSchedule.userId, user.id));

    return { schedules };
  }, {
    auth: true
  })

  .post("/", async ({ body, user }) => {
    // Verify connection exists and belongs to user
    const [connection] = await db
      .select()
      .from(backupConnection)
      .where(
        and(
          eq(backupConnection.id, body.connectionId),
          eq(backupConnection.userId, user.id)
        )
      );

    if (!connection) {
      throw new Error("Connection not found");
    }

    const scheduleId = crypto.randomUUID();

    const [newSchedule] = await db
      .insert(backupSchedule)
      .values({
        id: scheduleId,
        name: body.name,
        cronExpression: body.cronExpression,
        timezone: body.timezone || "UTC",
        connectionId: body.connectionId,
        userId: user.id
      })
      .returning();

    // Schedule the backup
    await backupScheduler.scheduleBackup(scheduleId);

    return { schedule: newSchedule };
  }, {
    auth: true,
    body: scheduleSchema
  })

  .get("/:id", async ({ params, user }) => {
    const [schedule] = await db
      .select({
        id: backupSchedule.id,
        name: backupSchedule.name,
        cronExpression: backupSchedule.cronExpression,
        timezone: backupSchedule.timezone,
        isActive: backupSchedule.isActive,
        lastRunAt: backupSchedule.lastRunAt,
        nextRunAt: backupSchedule.nextRunAt,
        createdAt: backupSchedule.createdAt,
        updatedAt: backupSchedule.updatedAt,
        connectionId: backupSchedule.connectionId,
        connectionName: backupConnection.name
      })
      .from(backupSchedule)
      .leftJoin(backupConnection, eq(backupSchedule.connectionId, backupConnection.id))
      .where(
        and(
          eq(backupSchedule.id, params.id),
          eq(backupSchedule.userId, user.id)
        )
      );

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    return { schedule };
  }, {
    auth: true,
    params: t.Object({
      id: t.String()
    })
  })

  .put("/:id", async ({ params, body, user }) => {
    // Verify connection exists and belongs to user
    const [connection] = await db
      .select()
      .from(backupConnection)
      .where(
        and(
          eq(backupConnection.id, body.connectionId),
          eq(backupConnection.userId, user.id)
        )
      );

    if (!connection) {
      throw new Error("Connection not found");
    }

    const [updatedSchedule] = await db
      .update(backupSchedule)
      .set({
        name: body.name,
        cronExpression: body.cronExpression,
        timezone: body.timezone || "UTC",
        connectionId: body.connectionId,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(backupSchedule.id, params.id),
          eq(backupSchedule.userId, user.id)
        )
      )
      .returning();

    if (!updatedSchedule) {
      throw new Error("Schedule not found");
    }

    // Reschedule the backup
    await backupScheduler.scheduleBackup(params.id);

    return { schedule: updatedSchedule };
  }, {
    auth: true,
    params: t.Object({
      id: t.String()
    }),
    body: scheduleSchema
  })

  .delete("/:id", async ({ params, user }) => {
    const [deletedSchedule] = await db
      .delete(backupSchedule)
      .where(
        and(
          eq(backupSchedule.id, params.id),
          eq(backupSchedule.userId, user.id)
        )
      )
      .returning({ id: backupSchedule.id });

    if (!deletedSchedule) {
      throw new Error("Schedule not found");
    }

    // Cancel the scheduled backup
    await backupScheduler.cancelSchedule(params.id);

    return { message: "Schedule deleted successfully" };
  }, {
    auth: true,
    params: t.Object({
      id: t.String()
    })
  })

  .post("/:id/toggle", async ({ params, user }) => {
    const [schedule] = await db
      .select()
      .from(backupSchedule)
      .where(
        and(
          eq(backupSchedule.id, params.id),
          eq(backupSchedule.userId, user.id)
        )
      );

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    const newStatus = !schedule.isActive;

    const [updatedSchedule] = await db
      .update(backupSchedule)
      .set({
        isActive: newStatus,
        updatedAt: new Date()
      })
      .where(eq(backupSchedule.id, params.id))
      .returning();

    if (newStatus) {
      // Schedule the backup
      await backupScheduler.scheduleBackup(params.id);
    } else {
      // Cancel the backup
      backupScheduler.cancelJob(params.id);
    }

    return { schedule: updatedSchedule };
  }, {
    auth: true,
    params: t.Object({
      id: t.String()
    })
  })

  .post("/:id/run", async ({ params, user }) => {
    const [schedule] = await db
      .select()
      .from(backupSchedule)
      .where(
        and(
          eq(backupSchedule.id, params.id),
          eq(backupSchedule.userId, user.id)
        )
      );

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    // Trigger immediate backup
    backupScheduler.executeScheduledBackup(params.id);

    return { message: "Backup triggered successfully" };
  }, {
    auth: true,
    params: t.Object({
      id: t.String()
    })
  });