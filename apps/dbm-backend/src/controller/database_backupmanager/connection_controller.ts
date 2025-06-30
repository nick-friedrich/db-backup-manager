
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { backupConnection } from "@packages/sqlite_schema/dbm";
import { Client } from "pg";
import { authPlugin } from "../../lib/auth-plugin";

const connectionSchema = t.Object({
  name: t.String(),
  type: t.String(),
  host: t.String(),
  port: t.Number(),
  database: t.String(),
  username: t.String(),
  password: t.String()
});

export const connectionController = new Elysia({ prefix: "/connections" })
  .use(authPlugin)
  .get("/", async ({ user }) => {
    const connections = await db
      .select({
        id: backupConnection.id,
        name: backupConnection.name,
        type: backupConnection.type,
        host: backupConnection.host,
        port: backupConnection.port,
        database: backupConnection.database,
        username: backupConnection.username,
        postgresqlVersion: backupConnection.postgresqlVersion,
        isActive: backupConnection.isActive,
        createdAt: backupConnection.createdAt,
        updatedAt: backupConnection.updatedAt
      })
      .from(backupConnection)
      .where(eq(backupConnection.userId, user.id));

    return { connections };
  }, {
    auth: true
  })

  .post("/", async ({ body, user }) => {
    const connectionId = crypto.randomUUID();

    const [newConnection] = await db
      .insert(backupConnection)
      .values({
        id: connectionId,
        name: body.name,
        type: body.type,
        host: body.host,
        port: body.port,
        database: body.database,
        username: body.username,
        password: body.password, // TODO: Encrypt in production
        userId: user.id
      })
      .returning({
        id: backupConnection.id,
        name: backupConnection.name,
        type: backupConnection.type,
        host: backupConnection.host,
        port: backupConnection.port,
        database: backupConnection.database,
        username: backupConnection.username,
        isActive: backupConnection.isActive,
        createdAt: backupConnection.createdAt
      });

    return { connection: newConnection };
  }, {
    auth: true,
    body: connectionSchema
  })

  .get("/:id", async ({ params, user }) => {
    const [connection] = await db
      .select({
        id: backupConnection.id,
        name: backupConnection.name,
        type: backupConnection.type,
        host: backupConnection.host,
        port: backupConnection.port,
        database: backupConnection.database,
        username: backupConnection.username,
        isActive: backupConnection.isActive,
        createdAt: backupConnection.createdAt,
        updatedAt: backupConnection.updatedAt
      })
      .from(backupConnection)
      .where(
        and(
          eq(backupConnection.id, params.id),
          eq(backupConnection.userId, user.id)
        )
      );

    if (!connection) {
      throw new Error("Connection not found");
    }

    return { connection };
  }, {
    auth: true,
    params: t.Object({
      id: t.String()
    })
  })

  .put("/:id", async ({ params, body, user }) => {
    const [updatedConnection] = await db
      .update(backupConnection)
      .set({
        name: body.name,
        type: body.type,
        host: body.host,
        port: body.port,
        database: body.database,
        username: body.username,
        password: body.password, // TODO: Encrypt in production
        updatedAt: new Date()
      })
      .where(
        and(
          eq(backupConnection.id, params.id),
          eq(backupConnection.userId, user.id)
        )
      )
      .returning({
        id: backupConnection.id,
        name: backupConnection.name,
        type: backupConnection.type,
        host: backupConnection.host,
        port: backupConnection.port,
        database: backupConnection.database,
        username: backupConnection.username,
        isActive: backupConnection.isActive,
        createdAt: backupConnection.createdAt,
        updatedAt: backupConnection.updatedAt
      });

    if (!updatedConnection) {
      throw new Error("Connection not found");
    }

    return { connection: updatedConnection };
  }, {
    auth: true,
    params: t.Object({
      id: t.String()
    }),
    body: connectionSchema
  })

  .delete("/:id", async ({ params, user }) => {
    const [deletedConnection] = await db
      .delete(backupConnection)
      .where(
        and(
          eq(backupConnection.id, params.id),
          eq(backupConnection.userId, user.id)
        )
      )
      .returning({ id: backupConnection.id });

    if (!deletedConnection) {
      throw new Error("Connection not found");
    }

    return { message: "Connection deleted successfully" };
  }, {
    auth: true,
    params: t.Object({
      id: t.String()
    })
  })

  .post("/:id/test", async ({ params, user }) => {
    // Get connection details
    const [connection] = await db
      .select()
      .from(backupConnection)
      .where(
        and(
          eq(backupConnection.id, params.id),
          eq(backupConnection.userId, user.id)
        )
      );

    if (!connection) {
      throw new Error("Connection not found");
    }

    // Test connection based on type
    if (connection.type === "postgresql") {
      try {
        const client = new Client({
          host: connection.host,
          port: connection.port,
          database: connection.database,
          user: connection.username,
          password: connection.password,
          connectionTimeoutMillis: 5000,
        });

        await client.connect();

        // Test basic connectivity
        await client.query('SELECT 1');

        // Detect PostgreSQL version
        const versionResult = await client.query('SELECT version()');
        const versionString = versionResult.rows[0]?.version || "";

        // Parse major version from version string (e.g., "PostgreSQL 16.1..." -> "16")
        const versionMatch = versionString.match(/PostgreSQL (\d+)\./);
        const majorVersion = versionMatch ? versionMatch[1] : null;

        await client.end();

        // Update connection with detected version if found
        if (majorVersion) {
          await db
            .update(backupConnection)
            .set({
              postgresqlVersion: majorVersion,
              updatedAt: new Date()
            })
            .where(eq(backupConnection.id, params.id));
        }

        return {
          success: true,
          message: "Connection successful",
          postgresqlVersion: majorVersion,
          detectedVersion: versionString
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Connection failed"
        };
      }
    }

    return { success: false, message: "Database type not supported yet" };
  }, {
    auth: true,
    params: t.Object({
      id: t.String()
    })
  });