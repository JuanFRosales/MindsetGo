import type { FastifyInstance } from "fastify";
import { getDb } from "../../db/sqlite.ts";
import { scrubText } from "../../utils/piiScrubber.ts";
import { getConversationSummary } from "../../models/conversationSummaryRepo.ts";

// Register routes for retrieving AI-generated conversation summaries
export const summaryRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // Fetch the latest summary for a specific conversation
  app.get("/chat/summary", async (req, reply) => {
    const userId = req.currentUserId;
    // Ensure the request is authenticated
    if (!userId) return reply.status(401).send({ error: "unauthorized" });

    const q = (req.query ?? {}) as any;
    const db = await getDb();
    
    // Retrieve summary from DB (defaults to "default" conversation if ID not provided)
    const row = await getConversationSummary(db, userId, q.conversationId ?? "default");
    
    // Return scrubbed summary text or an empty string if none exists
    return { summary: row ? scrubText(row.summaryText) : "" };
  });
};