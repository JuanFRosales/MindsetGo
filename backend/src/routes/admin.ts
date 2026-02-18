import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env.js";
import { getDb } from "../db/sqlite.js";
import { runTtlCleanup } from "../jobs/ttlCleanup.js";

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
  app.post("/admin/cleanup", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const result = await runTtlCleanup(app);
    return reply.send(result);
  });

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

  // 4. Route to expire all data for testing
  app.post("/admin/expire-test-data", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const db = await getDb();
    const now = Date.now();
    const past = now - 1000;
    const qrLinkRetentionHours = (env as any).qrLinkRetentionHours ?? (24 * 14);
    const wayPastLinks = now - (qrLinkRetentionHours * 60 * 60 * 1000) - 1000;

    // Calculate a point that is definitely beyond retention limits
    const inviteRetentionMs =
      (env.usedRetentionHoursInviteCodes + 1) * 60 * 60 * 1000;
    const proofRetentionMs =
      (env.usedRetentionHoursLoginProofs + 1) * 60 * 60 * 1000;

    // Force expiration for expiresAt
    await db.run("UPDATE sessions SET expiresAt = ?", past);
    await db.run("UPDATE invite_codes SET expiresAt = ?", past);
    await db.run("UPDATE login_proofs SET expiresAt = ?", past);
    await db.run("UPDATE qr_resolutions SET expiresAt = ?", past);
    await db.run("UPDATE webauthn_challenges SET expiresAt = ?", past);
    await db.run("UPDATE qr_links SET lastSeenAt = ?", past);
    await db.run("UPDATE qr_links SET lastSeenAt = ?", wayPastLinks);
    // Force expiration for usedAt records (beyond retention)
    await db.run(
      "UPDATE invite_codes SET usedAt = ? WHERE usedAt IS NOT NULL",
      now - inviteRetentionMs,
    );
    await db.run(
      "UPDATE login_proofs SET usedAt = ? WHERE usedAt IS NOT NULL",
      now - proofRetentionMs,
    );

    // Optional: expire users if the column exists
    try {
      await db.run("UPDATE users SET expiresAt = ?", past);
    } catch (e) {
      app.log.warn("users.expiresAt not present, skipping");
    }

    return reply.send({
      status: "ok",
      message: "All records updated to be expired or past retention",
    });
  });
};
