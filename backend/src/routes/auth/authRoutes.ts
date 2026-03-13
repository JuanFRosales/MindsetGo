import type { FastifyInstance } from "fastify";
import { inviteRoutes } from "./inviteRoutes.ts";
import { sessionRoutes } from "./sessionRoutes.ts";
import { meRoutes } from "./meRoutes.ts";

// Main function to register all authentication-related routes
export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  await inviteRoutes(app);
  await sessionRoutes(app);
  await meRoutes(app);
};
