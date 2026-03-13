import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.ts";
import { getDb } from "../../db/sqlite.ts";
import { emptyBodySchema } from "../../http/schemas.ts";
import { runTtlCleanup } from "../../jobs/ttlCleanup.ts";
import { createInvite } from "../../models/inviteRepo.ts";
import { requireAdminSession } from "../../middlewares/adminSessionAuth.ts";

// Register routes for system maintenance and manual cleanup tasks
export const adminMaintenanceRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // Trigger the TTL cleanup job manually to remove expired records
  app.post(
    "/admin/cleanup",
    {
      preHandler: requireAdminSession,
      schema: { body: emptyBodySchema },
    },
    async (_req, reply) => {
      const result = await runTtlCleanup(app);
      return reply.send(result);
    },
  );

  // Generate a new unique invitation code with a set expiration
  app.post(
    "/admin/invites",
    {
      preHandler: requireAdminSession,
      schema: { body: emptyBodySchema },
    },
    async (_req, reply) => {
      const db = await getDb();
      const invite = await createInvite(db, env.inviteTtlHours);

      return reply.status(201).send({
        code: invite.code,
        expiresAt: new Date(invite.expiresAt).toISOString(),
      });
    },
  );

  // Force all existing temporary data to expire for testing TTL logic
  app.post(
    "/admin/expire-test-data",
    {
      preHandler: requireAdminSession,
      schema: { body: emptyBodySchema },
    },
    async (_req, reply) => {
      const db = await getDb();
      const now = Date.now();
      const past = now - 1000;

      // Update basic expirable entities to the past
      await db.run("UPDATE sessions SET expiresAt = ?", past);
      await db.run("UPDATE invite_codes SET expiresAt = ?", past);
      await db.run("UPDATE login_proofs SET expiresAt = ?", past);
      await db.run("UPDATE qr_resolutions SET expiresAt = ?", past);
      await db.run("UPDATE webauthn_challenges SET expiresAt = ?", past);

      // Backdate lastSeen for QR links beyond retention period
      const qrLinkRetentionMs = env.qrLinkRetentionHours * 60 * 60 * 1000;
      await db.run("UPDATE qr_links SET lastSeenAt = ?", now - qrLinkRetentionMs - 1000);

      // Backdate usedAt for codes and proofs beyond retention thresholds
      const inviteRetentionMs = (env.usedRetentionHoursInviteCodes + 1) * 60 * 60 * 1000;
      const proofRetentionMs = (env.usedRetentionHoursLoginProofs + 1) * 60 * 60 * 1000;

      await db.run(
        "UPDATE invite_codes SET usedAt = ? WHERE usedAt IS NOT NULL",
        now - inviteRetentionMs,
      );
      await db.run(
        "UPDATE login_proofs SET usedAt = ? WHERE usedAt IS NOT NULL",
        now - proofRetentionMs,
      );

      // Attempt to expire users if the schema supports it
      try {
        await db.run("UPDATE users SET expiresAt = ?", past);
      } catch {
        app.log.debug("users.expiresAt not present");
      }

      return reply.send({ status: "ok" });
    },
  );
};