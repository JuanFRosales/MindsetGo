import type { FastifyInstance } from "fastify";
import { messageRoutes } from "./messageRoutes.ts";
import { summaryRoutes } from "./summaryRoutes.ts";
import { profileRoutes } from "./profileRoutes.ts";
import { historyRoutes } from "./historyRoutes.ts";

// Main function to register all chat-related routes
export const chatRoutes = async (app: FastifyInstance): Promise<void> => {
  await messageRoutes(app);
  await summaryRoutes(app);
  await profileRoutes(app);
  await historyRoutes(app);
};