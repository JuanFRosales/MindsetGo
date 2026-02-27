import cron from "node-cron";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.ts";
import { getDb } from "../db/sqlite.ts";

// helper to get current unix timestamp in milliseconds
const nowMs = (): number => Date.now();
// helper to convert hours to milliseconds
const hoursToMs = (h: number): number => h * 60 * 60 * 1000;

export const runTtlCleanup = async (app?: FastifyInstance): Promise<any> => {
  const db = await getDb();
  const now = nowMs();

  // load retention settings from env or defaults
  const inviteRetention = (env as any).usedRetentionHoursInviteCodes ?? 24;
  const proofRetention = (env as any).usedRetentionHoursLoginProofs ?? 1;
  const qrLinkRetentionHours = (env as any).qrLinkRetentionHours ?? 24 * 14;

  // 1. delete strictly expired records (expiresAt <= now)
  const p1 = await db.run("DELETE FROM login_proofs WHERE expiresAt IS NOT NULL AND expiresAt <= ?", now);
  const w1 = await db.run("DELETE FROM webauthn_challenges WHERE expiresAt IS NOT NULL AND expiresAt <= ?", now);
  const s1 = await db.run("DELETE FROM sessions WHERE expiresAt IS NOT NULL AND expiresAt <= ?", now);
  const r1 = await db.run("DELETE FROM qr_resolutions WHERE expiresAt IS NOT NULL AND expiresAt <= ?", now);
  const i1 = await db.run("DELETE FROM invite_codes WHERE expiresAt IS NOT NULL AND expiresAt <= ?", now);
  
  // delete expired chat data
  const m1 = await db.run("DELETE FROM messages WHERE expiresAt IS NOT NULL AND expiresAt <= ?", now);
  const ps1 = await db.run("DELETE FROM profile_state WHERE expiresAt IS NOT NULL AND expiresAt <= ?", now);
  const cs1 = await db.run("DELETE FROM conversation_summary WHERE expiresAt IS NOT NULL AND expiresAt <= ?", now);

  // 2. prune qr_links by inactivity (lastSeenAt)
  const ql1 = await db.run(
    "DELETE FROM qr_links WHERE lastSeenAt IS NOT NULL AND lastSeenAt <= ?",
    now - hoursToMs(qrLinkRetentionHours),
  );

  // 3. delete used records after grace period
  const i2 = await db.run(
    "DELETE FROM invite_codes WHERE usedAt IS NOT NULL AND usedAt <= ?",
    now - hoursToMs(inviteRetention),
  );
  const p2 = await db.run(
    "DELETE FROM login_proofs WHERE usedAt IS NOT NULL AND usedAt <= ?",
    now - hoursToMs(proofRetention),
  );

  const result = {
    deletedSessions: s1.changes ?? 0,
    deletedInvitesExpired: i1.changes ?? 0,
    deletedInvitesUsed: i2.changes ?? 0,
    deletedQrResolutions: r1.changes ?? 0,
    deletedQrLinks: ql1.changes ?? 0,
    deletedLoginProofsExpired: p1.changes ?? 0,
    deletedLoginProofsUsed: p2.changes ?? 0,
    deletedWebAuthnChallenges: w1.changes ?? 0,
    deletedMessages: m1.changes ?? 0,
    deletedProfileStates: ps1.changes ?? 0,
    deletedConversationSummaries: cs1.changes ?? 0,
  };

  // log counters only, never data content or userids
  if (app) {
    app.log.info(result, "ttl_cleanup_done");
  }

  return result;
};

export const registerTtlCleanupJob = (app: FastifyInstance): void => {
  const ttlEnabled = (env as any).ttlEnabled ?? true;
  const ttlCron = (env as any).ttlCron ?? "0 * * * *"; // default: every hour

  if (!ttlEnabled) {
    app.log.info("ttl cleanup disabled");
    return;
  }

  // schedule the job using node-cron
  cron.schedule(ttlCron, async () => {
    try {
      await runTtlCleanup(app);
    } catch (err) {
      app.log.error({ err }, "ttl cleanup failed");
    }
  });

  app.log.info({ ttlCron }, "ttl cleanup scheduled");
};