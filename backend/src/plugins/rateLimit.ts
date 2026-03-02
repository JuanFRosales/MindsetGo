import { FastifyInstance } from "fastify";
import { env } from "../config/env.ts";

type Entry = {
  count: number;
  resetAt: number;
};

export function rateLimitPlugin(app: FastifyInstance) {
  const windowMs = env.rateLimitWindowMs;
  const max = env.rateLimitMax;

  const store = new Map<string, Entry>();

  app.addHook("onRequest", async (request, reply) => {
    const sid = (request.cookies as any)?.[env.cookieName] as string | undefined;

    const ip =
      request.ip ||
      (request.headers["x-forwarded-for"] as string) ||
      "unknown";

    const key = sid ? `sid:${sid}` : `ip:${ip}`;

    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    entry.count += 1;

    if (entry.count > max) {
      return reply.code(429).send({ error: "too_many_requests" });
    }
  });
}
