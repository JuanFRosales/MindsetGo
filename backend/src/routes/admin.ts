import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env.ts";
import { getDb } from "../db/sqlite.ts";
import { runTtlCleanup } from "../jobs/ttlCleanup.ts";
import { emptyBodySchema } from "../http/schemas.ts";

// Require admin key in headers
const requireAdmin = (req: FastifyRequest, reply: FastifyReply): boolean => {
  const key = req.headers["x-admin-key"];
  const keyStr = Array.isArray(key) ? key[0] : key;
  if (keyStr !== env.adminKey) {
    reply.status(401).send({ error: "unauthorized" });
    return false;
  }
  return true;
};

export const adminRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // 1. TTL cleanup trigger
  // Uses emptyBodySchema - preValidation hook in app.ts ensures req.body = {}
  app.post(
    "/admin/cleanup",
    { schema: { body: emptyBodySchema } },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      const result = await runTtlCleanup(app);
      app.log.info({ bodyKeys: Object.keys(req.body ?? {}) }, "admin_cleanup_triggered");
      
      return reply.send(result);
    },
  );

  // 2. Database info (Pragmas)
  app.get("/admin/db-info", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const db = await getDb();
    const row = await db.get("PRAGMA database_list;");
    const fk = await db.get("PRAGMA foreign_keys;");
    return reply.send({ database: row, foreignKeys: fk });
  });

  // 3. Row counts for all tables
  app.get("/admin/db-counts", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const db = await getDb();
    const counts: Record<string, any> = {};
    const tables = [
      "users",
      "invite_codes",
      "sessions",
      "qr_links",
      "qr_resolutions",
      "passkeys",
      "webauthn_challenges",
      "login_proofs",
    ];

    for (const t of tables) {
      try {
        const r = await db.get(`SELECT COUNT(*) as c FROM ${t}`);
        counts[t] = r?.c ?? 0;
      } catch {
        counts[t] = "missing_table";
      }
    }
    return reply.send({ counts });
  });

  // 4. Clear passkeys for a user (for testing)
  app.post(
    "/admin/clear-passkeys",
    {
      schema: {
        body: {
          type: "object",
          required: ["userId"],
          additionalProperties: false,
          properties: {
            userId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      const { userId } = req.body as { userId: string };

      const db = await getDb();
      const r = await db.run("DELETE FROM passkeys WHERE userId = ?", userId);

      return reply.send({ ok: true, deleted: r.changes ?? 0 });
    },
  );

  // 5. Route to expire all data for testing
  // Uses emptyBodySchema - preValidation hook in app.ts ensures req.body = {}
  app.post(
    "/admin/expire-test-data", 
    { schema: { body: emptyBodySchema } },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      const db = await getDb();
      const now = Date.now();
      const past = now - 1000;
      const qrLinkRetentionHours = env.qrLinkRetentionHours;
      const wayPastLinks = now - (qrLinkRetentionHours * 60 * 60 * 1000) - 1000;

      // Calculate points beyond retention limits
      const inviteRetentionMs = (env.usedRetentionHoursInviteCodes + 1) * 60 * 60 * 1000;
      const proofRetentionMs = (env.usedRetentionHoursLoginProofs + 1) * 60 * 60 * 1000;

      // Force expiration for active records
      await db.run("UPDATE sessions SET expiresAt = ?", past);
      await db.run("UPDATE invite_codes SET expiresAt = ?", past);
      await db.run("UPDATE login_proofs SET expiresAt = ?", past);
      await db.run("UPDATE qr_resolutions SET expiresAt = ?", past);
      await db.run("UPDATE webauthn_challenges SET expiresAt = ?", past);
      
      // Handle QR links retention
      await db.run("UPDATE qr_links SET lastSeenAt = ?", wayPastLinks);
      
      // Force expiration for used records (historical cleanup test)
      await db.run(
        "UPDATE invite_codes SET usedAt = ? WHERE usedAt IS NOT NULL",
        now - inviteRetentionMs,
      );
      await db.run(
        "UPDATE login_proofs SET usedAt = ? WHERE usedAt IS NOT NULL",
        now - proofRetentionMs,
      );

      // Optional: expire users
      try {
        await db.run("UPDATE users SET expiresAt = ?", past);
      } catch (e) {
        app.log.debug("users.expiresAt not present, skipping");
      }

      return reply.send({
        status: "ok",
        message: "All records updated to be expired or past retention",
      });
    }
  );
};