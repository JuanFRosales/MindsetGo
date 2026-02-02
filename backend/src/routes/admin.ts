import type { FastifyInstance } from "fastify";
import { env } from "../config/env.ts";
import { runTtlCleanup } from "../jobs/ttlCleanup.ts";

// Require admin key in headers
const requireAdmin = (req: any, reply: any): boolean => {
  const key = req.headers["x-admin-key"];
  if (key !== env.adminKey) {
    reply.status(401).send({ error: "unauthorized" });
    return false;
  }
  return true;
};

export const adminRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/admin/cleanup", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return await runTtlCleanup(app);
  });
};
