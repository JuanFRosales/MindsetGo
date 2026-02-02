import type { FastifyInstance, FastifyRequest } from "fastify";
import { env } from "../config/env.ts";
import { getDb } from "../db/sqlite.ts";
import { getValidSession } from "../models/sessionRepo.ts";
import { getUserById } from "../models/userRepo.ts";

declare module "fastify" {
  interface FastifyRequest {
    currentUserId?: string;
  }
}

// Middleware to authenticate sessions from cookies
export const registerSessionAuth = (app: FastifyInstance): void => {
  app.addHook("preHandler", async (req: FastifyRequest) => {
    const sid = req.cookies?.[env.cookieName];
    if (!sid) return;

    const db = await getDb();
    const session = await getValidSession(db, String(sid));
    if (!session) return;

    const user = await getUserById(db, session.userId);
    if (!user) return;

    req.currentUserId = user.id;
  });
};
