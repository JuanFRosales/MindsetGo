import type { FastifyInstance } from "fastify";
import { getDb } from "../../db/sqlite.ts";
import { getUserById, touchUser } from "../../models/userRepo.ts";

// Register route to fetch the current authenticated user's profile
export const meRoutes = async (app: FastifyInstance): Promise<void> => {
  
  app.get("/auth/me", async (req, reply) => {
    // Current user ID is typically attached to the request by an auth decorator/middleware
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });

    const db = await getDb();
    const user = await getUserById(db, userId);
    
    // Safety check if user exists in the DB
    if (!user) return reply.status(401).send({ error: "unauthorized" });

    // Update the user's lastActiveAt timestamp on every check
    await touchUser(db, userId);
    
    // Fetch the updated user record to return the most recent timestamps
    const updated = await getUserById(db, userId);

    return { user: updated ?? user };
  });
};