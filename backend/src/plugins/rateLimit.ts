import { FastifyInstance } from "fastify";

type Entry = {
  count: number;
  resetAt: number;
};

export function rateLimitPlugin(app: FastifyInstance) {
  const windowMs = 60 * 1000;
  const max = 5;

  const store = new Map<string, Entry>();

  app.addHook("onRequest", async (request, reply) => {
    const ip =
      request.ip ||
      (request.headers["x-forwarded-for"] as string) ||
      "unknown";

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry) {
      store.set(ip, {
        count: 1,
        resetAt: now + windowMs,
      });
      return;
    }

    if (now > entry.resetAt) {
      store.set(ip, {
        count: 1,
        resetAt: now + windowMs,
      });
      return;
    }

    entry.count += 1;

    if (entry.count > max) {
      reply.code(429).send({
        error: "Too Many Requests",
      });
    }
  });
}