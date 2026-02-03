import type { FastifyError, FastifyInstance } from "fastify";

// Middleware to handle errors uniformly
export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setErrorHandler((err: FastifyError, req, reply) => {
    req.log.error({ err }, "request failed");

// Determine if the error is a bad request
    const isBadRequest =
      err.statusCode === 400 ||
      err.code === "FST_ERR_CTP_INVALID_JSON" ||
      err.code === "FST_ERR_VALIDATION";

    if (isBadRequest) {
      reply.status(400).send({ error: "bad_request" });
      return;
    }
// Set status code based on error type
    const status =
      err.statusCode && err.statusCode >= 400 && err.statusCode < 500
        ? err.statusCode
        : 500;

    reply.status(status).send({ error: "internal_error" });
  });
};
