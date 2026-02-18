import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env.js";
import { getDb } from "../db/sqlite.js";
import { createUser } from "../models/userRepo.js";
import {
  createInvite,
  getValidInvite,
  markInviteUsed,
} from "../models/inviteRepo.js";
import { createSession, deleteSession } from "../models/sessionRepo.js";
import {
  getValidQrResolution,
  deleteQrResolution,
} from "../models/qrResolutionRepo.js";
import {
  getValidLoginProof,
  markLoginProofUsed,
} from "../models/loginProofRepo.js";
import { userHasPasskey } from "../models/passkeyRepo.ts";


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
  app.post("/invites", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const db = await getDb();
    const invite = await createInvite(db, env.inviteTtlHours);

    return {
      code: invite.code,
      expiresAt: invite.expiresAt,
    };
  });

  // Direct login with invite code
  app.post("/auth/qr", async (req, reply) => {
    const { code: rawCode } = req.body as { code?: string };
    const code = rawCode?.trim();

    if (!code) {
      return reply.status(400).send({ error: "missing_code" });
    }

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
  });

  // Exchange a QR resolution for a session
  app.post("/auth/session", async (req, reply) => {
    const { proofId: rawProofId } = req.body as { proofId?: string };
    const proofId = rawProofId?.trim();

    if (!proofId) {
      return reply.status(400).send({ error: "missing_proofId" });
    }

    const db = await getDb();

    const proof = await getValidLoginProof(db, proofId);
    if (!proof) {
      return reply.status(401).send({ error: "invalid_or_expired_proof" });
    }

    const resolution = await getValidQrResolution(db, proof.resolutionId);
    if (!resolution || resolution.userId !== proof.userId) {
      return reply.status(400).send({ error: "invalid_resolution" });
    }

    const session = await createSession(
      db,
      proof.userId,
      env.sessionTtlMinutes,
    );

    const okUsed = await markLoginProofUsed(db, proofId);
    if (!okUsed) {
      return reply.status(409).send({ error: "proof_already_used" });
    }

    setSessionCookie(reply, session.id);
    await deleteQrResolution(db, resolution.id);

    return { userId: proof.userId, sessionExpiresAt: session.expiresAt };
  });

  // Logout route - Idempotentti poisto
  app.post("/auth/logout", async (req, reply) => {
    const sid = req.cookies?.[env.cookieName];
    
    if (sid) {
      const db = await getDb();
      await deleteSession(db, String(sid));
    }

    reply.clearCookie(env.cookieName, { 
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProd 
    });
    
    return reply.status(204).send();
  });

  // Get current authenticated user - Lukittu vasteformaatti
  app.get("/auth/me", async (req, reply) => {
  const userId = (req as any).currentUserId as string | undefined;
  if (!userId) return reply.status(401).send({ error: "unauthorized" });

  const db = await getDb();
  const hasPasskey = await userHasPasskey(db, userId);

  return {
    userId,
    profile: { hasPasskey },
  };
});

};