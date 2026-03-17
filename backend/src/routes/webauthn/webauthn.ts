import type { FastifyPluginAsync } from "fastify";
import { registerRoutes } from "./registerRoutes.ts";
import { loginRoutes } from "./loginRoutes.ts";

// WebAuthn routes for registration and login
export const webauthnRoutes: FastifyPluginAsync = async (app) => {
  await registerRoutes(app);
  await loginRoutes(app);
};