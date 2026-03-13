import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.ts";
import { deleteAdminSession, getAdminSession } from "../utils/adminSessions.ts";

// Extend FastifyRequest type to include authentication status
declare module "fastify" {
  interface FastifyRequest {
    isAdminAuthenticated?: boolean;
  }
}

// Middleware to enforce admin authentication via cookies
export const requireAdminSession = async (
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  // Retrieve session ID from cookies
  const sid = req.cookies?.[env.adminCookieName];

  if (!sid) {
    await reply.status(401).send({ error: "unauthorized" });
    return;
  }

  // Fetch session data from storage
  const session = await getAdminSession(sid);

  // Clear cookie and reject if session is missing
  if (!session) {
    reply.clearCookie(env.adminCookieName, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProd,
    });
    await reply.status(401).send({ error: "unauthorized" });
    return;
  }

  // Check if the session has expired
  const expired = session.expiresAt <= Date.now();

  if (expired) {
    // Cleanup expired session and reject request
    await deleteAdminSession(sid);
    reply.clearCookie(env.adminCookieName, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProd,
    });
    await reply.status(401).send({ error: "unauthorized" });
    return;
  }

  // Mark request as authenticated for subsequent handlers
  req.isAdminAuthenticated = true;
};