import type { FastifyError, FastifyInstance } from "fastify";

// Error handling middleware
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError, req, reply) => {
    req.log.error({ err }, "request failed");
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    reply.status(status).send({ error: "internal_error" });
  });
}
