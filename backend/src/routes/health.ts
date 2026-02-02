import type { FastifyInstance } from "fastify";

// Health check routes
export const healthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/health", async () => {
    return { ok: true };
  });
};