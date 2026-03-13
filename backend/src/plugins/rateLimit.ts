import { FastifyInstance } from "fastify";
import { env } from "../config/env.ts";

type Entry = {
  count: number;
  resetAt: number;
};

// Plugin to limit request rates per user session or IP
export function rateLimitPlugin(app: FastifyInstance) {
  const windowMs = env.rateLimitWindowMs;
  const defaultMax = env.rateLimitMax;

  // In-memory store for rate limit tracking
  const store = new Map<string, Entry>();

  app.addHook("onRequest", async (request, reply) => {
    // Identify user by session cookie or fallback to IP
    const sid = (request.cookies as any)?.[env.cookieName] as string | undefined;

    const ip =
      request.ip ||
      (request.headers["x-forwarded-for"] as string) ||
      "unknown";

    const baseKey = sid ? `sid:${sid}` : `ip:${ip}`;
    const url = request.raw.url ?? "";

    let max = defaultMax;

    // Apply endpoint-specific rate limit overrides
    if (url.startsWith("/qr/scan")) {
      max = 300;
    }

    if (url.startsWith("/auth/me")) {
      max = 200;
    }

    if (url.startsWith("/webauthn/")) {
      max = 150;
    }

    // Generate unique key per user and endpoint (ignoring query params)
    const key = `${baseKey}:${url.split("?")[0]}`;

    const now = Date.now();
    const entry = store.get(key);

    // Initialize or reset window if expired
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    // Increment request count
    entry.count += 1;

    // Reject request if limit is exceeded
    if (entry.count > max) {
      return reply.code(429).send({ error: "too_many_requests" });
    }
  });
}