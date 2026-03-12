import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.ts";
import { deleteAdminSession, getAdminSession } from "../utils/adminSessions.ts";

declare module "fastify" {
  interface FastifyRequest {
    isAdminAuthenticated?: boolean;
  }
}

export const requireAdminSession = async (
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  const sid = req.cookies?.[env.adminCookieName];

  if (!sid) {
    await reply.status(401).send({ error: "unauthorized" });
    return;
  }

  const session = await getAdminSession(sid);

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

  const expired = session.expiresAt <= Date.now();

  if (expired) {
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

  req.isAdminAuthenticated = true;
};