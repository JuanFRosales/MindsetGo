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

// Require admin key in headers
export const requireAdmin = (req: FastifyRequest, reply: FastifyReply): boolean => {
  const key = req.headers["x-admin-key"];
  if (key !== env.adminKey) {
    reply.status(401).send({ error: "unauthorized" });
    return false;
  }
  return true;
};

// Authentication and invite routes
export const authRoutes = async (app: FastifyInstance): Promise<void> => {
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

    reply.setCookie(env.cookieName, session.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return { userId: user.id, expiresAt: session.expiresAt };
  });

  // Exchange a QR resolution for a session (with QR ID validation)
  app.post("/auth/session", async (req, reply) => {
    const { resolutionId: rawResId, qrId: rawQrId } = req.body as { 
      resolutionId?: string; 
      qrId?: string; 
    };
    
    const resolutionId = rawResId?.trim();
    const qrId = rawQrId?.trim();
    
    if (!resolutionId || !qrId) {
      return reply.status(400).send({ error: "missing_resolutionId_or_qrId" });
    }

    const db = await getDb();
    const resolution = await getValidQrResolution(db, resolutionId);
    
    if (!resolution) {
      return reply.status(400).send({ error: "invalid_resolutionId" });
    }

    // Security check: ensure the resolution belongs to the specific QR ID
    if (resolution.qrId !== qrId) {
      return reply.status(400).send({ error: "mismatch" });
    }

    const session = await createSession(
      db,
      resolution.userId,
      env.sessionTtlMinutes,
    );

    reply.setCookie(env.cookieName, session.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    await deleteQrResolution(db, resolutionId);

    return { userId: resolution.userId, sessionExpiresAt: session.expiresAt };
  });

  // Logout route
  app.post("/auth/logout", async (req, reply) => {
    const sid = req.cookies?.[env.cookieName];
    const db = await getDb();

    if (sid) {
      await deleteSession(db, String(sid));
    }

    reply.clearCookie(env.cookieName, { path: "/" });
    return reply.status(204).send();
  });

  // Get current authenticated user
  app.get("/auth/me", async (req, reply) => {
    const userId = (req as any).currentUserId as string | undefined;
    if (!userId) {
      return reply.status(401).send({ error: "unauthorized" });
    }
    return { userId };
  });
};