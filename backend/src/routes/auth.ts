import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env.ts";
import { getDb } from "../db/sqlite.ts";
import { createUser, getUserById, touchUser } from "../models/userRepo.ts";
import {
  createInvite,
  getValidInvite,
  markInviteUsed,
} from "../models/inviteRepo.ts";
import { createSession, deleteSession } from "../models/sessionRepo.ts";
import {
  getValidQrResolution,
  deleteQrResolution,
} from "../models/qrResolutionRepo.ts";
import {
  getValidLoginProof,
  markLoginProofUsed,
} from "../models/loginProofRepo.ts";
import { emptyBodySchema, idString } from "../http/schemas.ts";

// Check if in production for cookie settings
const isProd = process.env.NODE_ENV === "production";

// Require admin key in headers
export const requireAdmin = (
  req: FastifyRequest,
  reply: FastifyReply,
): boolean => {
  const key = req.headers["x-admin-key"];
  if (key !== env.adminKey) {
    reply.status(401).send({ error: "unauthorized" });
    return false;
  }
  return true;
};

// Authentication and invite routes
export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // Helper to set session cookie with appropriate options
  const setSessionCookie = (reply: FastifyReply, sessionId: string) => {
    reply.setCookie(env.cookieName, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: env.sessionTtlMinutes * 60, 
    });
  };

  // Create a new invite code
  app.post(
    "/invites",
    { schema: { body: emptyBodySchema } },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;

      const db = await getDb();
      const invite = await createInvite(db, env.inviteTtlHours);

      return { code: invite.code, expiresAt: invite.expiresAt };
    },
  );

  // Direct login with invite code
  app.post(
    "/auth/qr",
    {
      schema: {
        body: {
          type: "object",
          required: ["code"],
          additionalProperties: false,
          properties: {
            code: idString,
          },
        },
      },
    },
    async (req, reply) => {
      const { code: rawCode } = req.body as { code: string };
      const code = rawCode.trim();

      const db = await getDb();
      const invite = await getValidInvite(db, code);
      if (!invite) {
        return reply.status(400).send({ error: "invalid_code" });
      }

      const user = await createUser(db, env.userTtlDays);
      await markInviteUsed(db, code, user.id);

      const session = await createSession(db, user.id, env.sessionTtlMinutes);
      setSessionCookie(reply, session.id);

      return { userId: user.id, expiresAt: session.expiresAt };
    },
  );

  // Exchange a QR resolution (login proof) for a session
  app.post(
    "/auth/session",
    {
      schema: {
        body: {
          type: "object",
          required: ["proofId"],
          additionalProperties: false,
          properties: {
            proofId: idString,
          },
        },
      },
    },
    async (req, reply) => {
      const { proofId: rawProofId } = req.body as { proofId: string };
      const proofId = rawProofId.trim();

      const db = await getDb();

      const proof = await getValidLoginProof(db, proofId);
      if (!proof) {
        return reply.status(401).send({ error: "invalid_or_expired_proof" });
      }

      const resolution = await getValidQrResolution(db, proof.resolutionId);
      if (!resolution || resolution.userId !== proof.userId) {
        return reply.status(400).send({ error: "invalid_resolution" });
      }

      const session = await createSession(db, proof.userId, env.sessionTtlMinutes);

      const okUsed = await markLoginProofUsed(db, proofId);
      if (!okUsed) {
        return reply.status(409).send({ error: "proof_already_used" });
      }

      setSessionCookie(reply, session.id);
      await deleteQrResolution(db, resolution.id);

      return { userId: proof.userId, sessionExpiresAt: session.expiresAt };
    },
  );

  /**
   * Get current session user info.
   * Uses req.currentUserId set by sessionAuth middleware.
   */
  app.get("/auth/me", async (req, reply) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });

    const db = await getDb();
    const user = await getUserById(db, userId);
    if (!user) return reply.status(401).send({ error: "unauthorized" });

    // Keep the user and session active
    await touchUser(db, userId);
    const updated = await getUserById(db, userId);

    return { user: updated ?? user };
  });

  // Logout route - Idempotent removal
  app.post(
    "/auth/logout",
    { schema: { body: emptyBodySchema } },
    async (req, reply) => {
      const sid = req.cookies?.[env.cookieName];

      if (sid) {
        const db = await getDb();
        await deleteSession(db, String(sid));
      }

      reply.clearCookie(env.cookieName, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
      });

      return reply.status(204).send();
    },
  );
};