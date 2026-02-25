import cron from "node-cron";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.ts";
import { getDb } from "../db/sqlite.ts";

const nowMs = (): number => Date.now();
const hoursToMs = (h: number): number => h * 60 * 60 * 1000;

export const runTtlCleanup = async (app?: FastifyInstance): Promise<any> => {
  const db = await getDb();
  const now = nowMs();

  // Retention settings
  const inviteRetention = (env as any).usedRetentionHoursInviteCodes ?? 24;
  const proofRetention = (env as any).usedRetentionHoursLoginProofs ?? 1;
  const qrLinkRetentionHours = (env as any).qrLinkRetentionHours ?? 24 * 14;

  // 1. Delete expired records, children first
  const p1 = await db.run("DELETE FROM login_proofs WHERE expiresAt <= ?", now);
  const w1 = await db.run("DELETE FROM webauthn_challenges WHERE expiresAt <= ?", now);
  const s1 = await db.run("DELETE FROM sessions WHERE expiresAt <= ?", now);
  const r1 = await db.run("DELETE FROM qr_resolutions WHERE expiresAt <= ?", now);
  const i1 = await db.run("DELETE FROM invite_codes WHERE expiresAt <= ?", now);
  
  // Delete expired messages
  const m1 = await db.run("DELETE FROM messages WHERE expiresAt <= ?", now);

  // Delete expired profile states and summaries
  const ps1 = await db.run("DELETE FROM profile_state WHERE expiresAt <= ?", now);
  const cs1 = await db.run("DELETE FROM conversation_summary WHERE expiresAt <= ?", now);

  // Prune qr_links by lastSeenAt
  const ql1 = await db.run(
    "DELETE FROM qr_links WHERE lastSeenAt <= ?",
    now - hoursToMs(qrLinkRetentionHours),
  );

  // 2. Delete used records after retention
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
    deletedProfileState: ps1.changes ?? 0,
    deletedConversationSummary: cs1.changes ?? 0,
  };

  if (app) {
    app.log.info(
      {
        ...result,
      },
      "ttl_cleanup_done"
    );
  }

  return result;
};

export const registerTtlCleanupJob = (app: FastifyInstance): void => {
  const ttlEnabled = (env as any).ttlEnabled ?? true;
  const ttlCron = (env as any).ttlCron ?? "0 * * * *";

  if (!ttlEnabled) {
    app.log.info("ttl cleanup disabled");
    return;
  }

  // Schedule physical deletion via node-cron
  cron.schedule(ttlCron, async () => {
    try {
      await runTtlCleanup(app);
    } catch (err) {
      app.log.error({ err }, "ttl cleanup failed");
    }
  });

  app.log.info({ ttlCron }, "ttl cleanup scheduled");
};