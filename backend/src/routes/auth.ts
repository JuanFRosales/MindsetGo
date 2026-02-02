import type { FastifyInstance } from "fastify";
import { env } from "../config/env.ts";
import { getDb } from "../db/sqlite.ts";
import { createUser } from "../models/userRepo.ts";
import { createInvite, getValidInvite, markInviteUsed } from "../models/inviteRepo.ts";
import { createSession, deleteSession } from "../models/sessionRepo.ts";

// Require admin key in headers
const requireAdmin = (req: any, reply: any): boolean => {
  const key = req.headers["x-admin-key"];
  if (key !== env.adminKey) {
    reply.status(401).send({ error: "unauthorized" });
    return false;
  }
  return true;
};

// Authentication and invite routes
export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/invites", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;

    const db = await getDb();
    const invite = await createInvite(db, env.inviteTtlHours);

    return {
      code: invite.code,
      expiresAt: invite.expiresAt
    };
  });

// Qr code login route
  app.post("/auth/qr", async (req, reply) => {
    const body = req.body as { code?: string };
    const code = body?.code?.trim();
    if (!code) return reply.status(400).send({ error: "missing_code" });

    const db = await getDb();
    const invite = await getValidInvite(db, code);
    if (!invite) return reply.status(400).send({ error: "invalid_code" });

    const user = await createUser(db, env.userTtlDays);
    await markInviteUsed(db, code, user.id);

    const session = await createSession(db, user.id, env.sessionTtlMinutes);

    reply.setCookie(env.cookieName, session.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/"
    });

    return { userId: user.id, expiresAt: session.expiresAt };
  });

// Logout route
  app.post("/auth/logout", async (req, reply) => {
    const sid = req.cookies?.[env.cookieName];
    const db = await getDb();

    if (sid) await deleteSession(db, String(sid));

    reply.clearCookie(env.cookieName, { path: "/" });
    return reply.status(204).send();
  });
// Get current authenticated user
  app.get("/auth/me", async (req, reply) => {
    const userId = (req as any).currentUserId as string | undefined;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });
    return { userId };
  });
};
