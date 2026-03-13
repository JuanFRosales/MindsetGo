import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.ts";
import { getDb } from "../../db/sqlite.ts";
import { scrubText } from "../../utils/piiScrubber.ts";
import {
  listRecentMessages,
  deleteConversationMessages,
} from "../../models/messageRepo.ts";
import {
  deleteProfileState,
} from "../../models/profileStateRepo.ts";
import {
  deleteConversationSummary,
} from "../../models/conversationSummaryRepo.ts";
import { emptyBodySchema } from "./chatSchemas.ts";

// Register routes for managing and clearing chat history
export const historyRoutes = async (app: FastifyInstance): Promise<void> => {
  const ctxLimit = env.messageContextLimit;

  // Retrieve the most recent messages for a conversation, chronological order
  app.get("/chat/history", async (req, reply) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });
    
    const q = (req.query ?? {}) as any;
    const db = await getDb();
    
    // Fetch limited context and reverse from DB order to UI order
    const rows = await listRecentMessages(db, userId, q.conversationId ?? "default", ctxLimit);
    return rows
      .reverse()
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: scrubText(m.content), // Ensure PII is scrubbed for the UI
        createdAt: m.createdAt,
      }));
  });

  // Wipe all data related to a conversation, including AI-generated states
  app.post(
    "/chat/clear",
    { schema: { body: emptyBodySchema } },
    async (req, reply) => {
      const userId = req.currentUserId;
      if (!userId) return reply.status(401).send({ error: "unauthorized" });
      
      const q = (req.query ?? {}) as any;
      const conversationId = q.conversationId ?? "default";

      const db = await getDb();
      
      // Perform a full cleanup: messages, summaries, and learned profile state
      await deleteConversationMessages(db, userId, conversationId);
      await deleteConversationSummary(db, userId, conversationId);
      await deleteProfileState(db, userId);

      return reply.status(204).send();
    },
  );
};
