import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.ts";
import { getDb } from "../../db/sqlite.ts";
import { scrubText } from "../../utils/piiScrubber.ts";
import {
  createMessage,
  getMessageById,
  deleteMessageById,
} from "../../models/messageRepo.ts";
import {
  chatMessageBodySchema,
  chatMessageIdParamsSchema,
} from "./chatSchemas.ts";
import { processMessageInBackground } from "./messageProcessing.ts";

// Register routes for handling chat messages and asynchronous AI background tasks
export const messageRoutes = async (app: FastifyInstance): Promise<void> => {
  const ttlDays = env.messageTtlDays;
  const ctxLimit = env.messageContextLimit;

  // Endpoint to send a new message and trigger AI processing
  app.post(
    "/chat/message",
    {
      schema: {
        body: chatMessageBodySchema,
      },
    },
    async (req, reply) => {
      const userId = req.currentUserId;
      if (!userId) return reply.status(401).send({ error: "unauthorized" });

      const body = req.body as { message: string; conversationId?: string };
      const conversationId = body.conversationId ?? "default";
      const db = await getDb();

      // Scrub user input for PII before database storage
      const scrubbedUserMsg = scrubText(body.message);

      // Save user message and create a placeholder for the upcoming assistant reply
      await createMessage(db, { userId, conversationId, role: "user", content: scrubbedUserMsg, ttlDays });
      const placeholder = await createMessage(db, { userId, conversationId, role: "assistant", content: "processing", ttlDays });

      // Execute AI reply, summary, and profile updates in the background
      // This allows the server to respond immediately while work continues
      void processMessageInBackground(app, {
        userId,
        conversationId,
        scrubbedUserMsg,
        placeholderId: placeholder.id,
        ttlDays,
        ctxLimit,
      });

      return { assistantMessageId: placeholder.id, conversationId, status: "queued" };
    },
  );

  // Fetch a specific message by its ID
  app.get(
    "/chat/message/:id",
    {
      schema: {
        params: chatMessageIdParamsSchema,
      },
    },
    async (req, reply) => {
      const userId = req.currentUserId;
      if (!userId) return reply.status(401).send({ error: "unauthorized" });
      const p = req.params as { id: string };
      const db = await getDb();
      const row = await getMessageById(db, userId, p.id);

      if (!row) return reply.status(404).send({ error: "not_found" });
      
      return {
        id: row.id,
        role: row.role,
        content: scrubText(row.content),
        createdAt: row.createdAt,
      };
    },
  );

  // Permanently remove a specific message
  app.delete(
    "/chat/message/:id",
    {
      schema: {
        params: chatMessageIdParamsSchema,
      },
    },
    async (req, reply) => {
      const userId = req.currentUserId;
      if (!userId) return reply.status(401).send({ error: "unauthorized" });
      const p = req.params as { id: string };
      const db = await getDb();
      const ok = await deleteMessageById(db, userId, p.id);

      if (!ok) return reply.status(404).send({ error: "not_found" });
      return reply.status(204).send();
    },
  );
};