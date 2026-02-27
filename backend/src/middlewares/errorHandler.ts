import type { FastifyError, FastifyInstance } from "fastify";

export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setErrorHandler((err: FastifyError, req, reply) => {
    const status =
      err.statusCode && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : 500;

    const logData = { code: err.code, statusCode: status };

    // selective logging: 5xx as error, 4xx as info/rejected
    if (status >= 500) {
      req.log.error(logData, "request_failed");
    } else {
      req.log.info(logData, "request_rejected");
    }

    // --- client responses (no sensitive details) ---

    // handle body too large specifically
    if (err.code === "FST_ERR_CTP_BODY_TOO_LARGE" || status === 413) {
      return reply.status(413).send({ error: "payload_too_large" });
    }

    // 400 bad request & validation errors
    if (
      status === 400 ||
      err.code === "FST_ERR_CTP_INVALID_JSON" ||
      err.code === "FST_ERR_VALIDATION"
    ) {
      return reply.status(400).send({ error: "bad_request" });
    }

    // 401 unauthorized
    if (status === 401) {
      return reply.status(401).send({ error: "unauthorized" });
    }

    // 404 not found
    if (status === 404) {
      return reply.status(404).send({ error: "not_found" });
    }

    // 409 conflict
    if (status === 409) {
      return reply.status(409).send({ error: "conflict" });
    }

    // 500 internal error for everything else
    reply.status(500).send({ error: "internal_error" });
  });

  // unified not found handler at the route level
  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({ error: "not_found" });
  });
};