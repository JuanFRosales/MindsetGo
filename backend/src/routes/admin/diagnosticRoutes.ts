import type { FastifyInstance } from "fastify";
import { getDb } from "../../db/sqlite.ts";
import { requireAdminSession } from "../../middlewares/adminSessionAuth.ts";

// Register diagnostic and database inspection routes
export const adminDiagnosticRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // Retrieve SQLite PRAGMA info about the database and foreign key status
  app.get("/admin/db-info", { preHandler: requireAdminSession }, async (_req, reply) => {
    const db = await getDb();
    const database = await db.all("PRAGMA database_list;");
    const foreignKeys = await db.get("PRAGMA foreign_keys;");

    return reply.send({ database, foreignKeys });
  });

  // Fetch row counts for all primary application tables
  app.get("/admin/db-counts", { preHandler: requireAdminSession }, async (_req, reply) => {
    const db = await getDb();
    const counts: Record<string, number | string> = {};
    const tables = [
      "users",
      "invite_codes",
      "sessions",
      "qr_links",
      "qr_resolutions",
      "passkeys",
      "webauthn_challenges",
      "login_proofs",
      "conversation_summary",
      "messages",
      "profile_state",
    ];

    // Iterate through tables and count records, handling missing tables gracefully
    for (const table of tables) {
      try {
        const row = await db.get<{ c: number }>(`SELECT COUNT(*) as c FROM ${table}`);
        counts[table] = row?.c ?? 0;
      } catch {
        counts[table] = "missing_table";
      }
    }

    return reply.send({ counts });
  });
};