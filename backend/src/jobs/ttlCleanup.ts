import cron from "node-cron";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.ts";
import { getDb } from "../db/sqlite.ts";

// Helper functions to get current time and calculate past time
const nowMs = (): number => Date.now();
const hoursAgoMs = (h: number): number => nowMs() - h * 60 * 60 * 1000;

// Run TTL cleanup for sessions, invite codes, and users
export const runTtlCleanup = async (app?: FastifyInstance): Promise<{
  deletedSessions: number;
  deletedInvitesExpired: number;
  deletedInvitesUsed: number;
  deletedUsers: number;
}> => {
  const db = await getDb();
  const now = nowMs();
  const usedCutoff = hoursAgoMs(env.inviteUsedRetentionHours);

  const s1 = await db.run("DELETE FROM sessions WHERE expiresAt <= ?", now);

  const i1 = await db.run("DELETE FROM invite_codes WHERE expiresAt <= ?", now);

  const i2 = await db.run(
    "DELETE FROM invite_codes WHERE usedAt IS NOT NULL AND usedAt <= ?",
    usedCutoff
  );

  const u1 = await db.run("DELETE FROM users WHERE expiresAt <= ?", now);

  const result = {
    deletedSessions: s1.changes ?? 0,
    deletedInvitesExpired: i1.changes ?? 0,
    deletedInvitesUsed: i2.changes ?? 0,
    deletedUsers: u1.changes ?? 0
  };

  if (app) app.log.info({ result }, "ttl cleanup done");
  return result;
};

// Register the TTL cleanup job with the Fastify instance
export const registerTtlCleanupJob = (app: FastifyInstance): void => {
  if (!env.ttlEnabled) {
    app.log.info("ttl cleanup disabled");
    return;
  }

  if (!cron.validate(env.ttlCron)) {
    app.log.error({ ttlCron: env.ttlCron }, "invalid ttl cron");
    return;
  }

  cron.schedule(env.ttlCron, async () => {
    try {
      await runTtlCleanup(app);
    } catch (err) {
      app.log.error({ err }, "ttl cleanup failed");
    }
  });

  app.log.info({ ttlCron: env.ttlCron }, "ttl cleanup scheduled");
};
