import type { FastifyInstance } from "fastify";
import { getDb } from "../../db/sqlite.ts";
import { getProfileState } from "../../models/profileStateRepo.ts";
import { scrubJsonValues } from "./chatHelpers.ts";

// Register routes for user profile management
export const profileRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // Fetch the current structured profile state inferred by the AI
  app.get("/profile", async (req, reply) => {
    const userId = req.currentUserId;
    // Standard check to ensure the user is logged in
    if (!userId) return reply.status(401).send({ error: "unauthorized" });

    const db = await getDb();
    const row = await getProfileState(db, userId);
    
    // Parse the stored JSON string or return an empty object if no profile exists
    const parsed = row ? JSON.parse(row.stateJson) : {};
    
    // Scrub the JSON values for PII before sending the profile to the client
    return scrubJsonValues(parsed);
  });
};