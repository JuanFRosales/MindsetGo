import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.ts";
import {
  cleanupExpiredAdminSessions,
  createAdminSession,
  deleteAdminSession,
  getAdminSession,
} from "../../utils/adminSessions.ts";
import {
  sendExpiredAdminSession,
  sendInvalidAdminKey,
  sendInvalidAdminSession,
  sendMissingAdminSession,
} from "./adminResponses.ts";

// Register authentication routes for the admin panel
export const adminAuthRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // Handle admin login, verify key, and issue session cookie
  app.post("/admin/login", async (req, reply) => {
    // Clear old session data before login attempt
    await cleanupExpiredAdminSessions();

    const body = req.body as { key?: string };
    const key = body?.key?.trim();

    // Verify against the master admin key from environment
    if (!key || key !== env.adminKey) {
      return sendInvalidAdminKey(reply);
    }

    const sessionId = await createAdminSession();

    // Set secure HTTP-only cookie for the session
    reply.setCookie(env.adminCookieName, sessionId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProd,
    });

    return reply.send({ ok: true, admin: true });
  });

  // Verify and return current admin session status
  app.get("/admin/me", async (req, reply) => {
    const sid = req.cookies?.[env.adminCookieName];
    if (!sid) {
      return sendMissingAdminSession(reply);
    }

    const session = await getAdminSession(sid);
    if (!session) {
      return sendInvalidAdminSession(reply);
    }

    // Ensure session hasn't expired since last check
    if (session.expiresAt <= Date.now()) {
      await deleteAdminSession(sid);
      reply.clearCookie(env.adminCookieName, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: env.isProd,
      });

      return sendExpiredAdminSession(reply);
    }

    return reply.send({ admin: true });
  });

  // Terminate admin session and clear identity cookie
  app.post("/admin/logout", async (req, reply) => {
    const sid = req.cookies?.[env.adminCookieName];
    if (sid) await deleteAdminSession(sid);

    reply.clearCookie(env.adminCookieName, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProd,
    });

    return reply.status(204).send();
  });
};