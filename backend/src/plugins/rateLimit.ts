import { FastifyInstance } from "fastify";
import { env } from "../config/env.ts";

type Entry = {
  count: number;
  resetAt: number;
};

export function rateLimitPlugin(app: FastifyInstance) {
  const windowMs = env.rateLimitWindowMs;
  const defaultMax = env.rateLimitMax;

  const store = new Map<string, Entry>();

  app.addHook("onRequest", async (request, reply) => {
    const sid = (request.cookies as any)?.[env.cookieName] as string | undefined;

    const ip =
      request.ip ||
      (request.headers["x-forwarded-for"] as string) ||
      "unknown";

    const baseKey = sid ? `sid:${sid}` : `ip:${ip}`;

    const url = request.raw.url ?? "";

    let max = defaultMax;

    if (url.startsWith("/qr/scan")) {
      max = 300;
    }

    if (url.startsWith("/auth/me")) {
      max = 200;
    }

    if (url.startsWith("/webauthn/")) {
      max = 150;
    }

    const key = `${baseKey}:${url.split("?")[0]}`;

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