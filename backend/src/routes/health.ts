import type { FastifyInstance } from "fastify";

// Health check routes
export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return { ok: true };
  });
}
