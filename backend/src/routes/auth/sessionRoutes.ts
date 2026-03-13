import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.ts";
import { getDb } from "../../db/sqlite.ts";
import { createUser, touchUser } from "../../models/userRepo.ts";
import {
  getInviteForLogin,
  markInviteUsed,
} from "../../models/inviteRepo.ts";
import { createSession, deleteSession } from "../../models/sessionRepo.ts";
import {
  getValidQrResolution,
  deleteQrResolution,
} from "../../models/qrResolutionRepo.ts";
import {
  getValidLoginProof,
  markLoginProofUsed,
} from "../../models/loginProofRepo.ts";
import {
  emptyBodySchema,
  inviteCodeBodySchema,
  proofIdBodySchema,
} from "./authSchemas.ts";
import { clearSessionCookie, setSessionCookie } from "./authHelpers.ts";

// Register routes for session creation and authentication flows
export const sessionRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // Login flow using an invite code (creates user if new, otherwise updates existing)
  app.post(
    "/auth/qr",
    {
      schema: {
        body: inviteCodeBodySchema,
      },
    },
    async (req, reply) => {
      const { code: rawCode } = req.body as { code: string };
      const code = rawCode.trim();

      const db = await getDb();
      
      // Verify invite code validity
      const invite = await getInviteForLogin(db, code);
      if (!invite) return reply.status(400).send({ error: "invalid_code" });

      let userId = invite.usedByUserId ?? null;

      if (!userId) {
        // Create a new ephemeral user and link the invite code
        const user = await createUser(db, env.userTtlDays);
        userId = user.id;
        await markInviteUsed(db, code, userId);
      } else {
        // Refresh the existing user's activity timestamp
        await touchUser(db, userId);
      }

      // Generate session and set the identity cookie
      const session = await createSession(db, userId, env.sessionTtlMinutes);
      setSessionCookie(reply, session.id);

      return { userId, expiresAt: session.expiresAt };
    },
  );

  // Exchange a login proof (from QR resolution) for a full session
  app.post(
    "/auth/session",
    {
      schema: {
        body: proofIdBodySchema,
      },
    },
    async (req, reply) => {
      const { proofId: rawProofId } = req.body as { proofId: string };
      const proofId = rawProofId.trim();

      const db = await getDb();

      // Ensure the login proof is valid and not expired
      const proof = await getValidLoginProof(db, proofId);
      if (!proof) return reply.status(401).send({ error: "invalid_or_expired_proof" });

      // Verify the QR resolution matches the user in the proof
      const resolution = await getValidQrResolution(db, proof.resolutionId);
      if (!resolution || resolution.userId !== proof.userId) {
        return reply.status(400).send({ error: "invalid_resolution" });
      }

      // Create new session for the verified user
      const session = await createSession(db, proof.userId, env.sessionTtlMinutes);

      // Atomic-style check to prevent proof reuse
      const okUsed = await markLoginProofUsed(db, proofId);
      if (!okUsed) return reply.status(409).send({ error: "proof_already_used" });

      // Finalize session and cleanup the temporary resolution record
      setSessionCookie(reply, session.id);
      await deleteQrResolution(db, resolution.id);

      return { userId: proof.userId, sessionExpiresAt: session.expiresAt };
    },
  );

  // Logout flow: remove session from DB and clear cookie
  app.post(
    "/auth/logout",
    { schema: { body: emptyBodySchema } },
    async (req, reply) => {
      const sid = req.cookies?.[env.cookieName];

      if (sid) {
        const db = await getDb();
        await deleteSession(db, String(sid));
      }

      clearSessionCookie(reply);

      return reply.status(204).send();
    },
  );
};