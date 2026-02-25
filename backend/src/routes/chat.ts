import type { FastifyInstance } from "fastify";
import { env } from "../config/env.ts";
import { getDb } from "../db/sqlite.ts";
import { scrubText } from "../utils/piiScrubber.ts"; 
import { createMessage, listRecentMessages, updateMessageContent } from "../models/messageRepo.ts";
import { generateReply } from "../ai/aiClient.ts";
import { getMessageById } from "../models/messageRepo.ts";
import { upsertProfileState } from "../models/profileStateRepo.ts";
import { upsertConversationSummary } from "../models/conversationSummaryRepo.ts";

export const chatRoutes = async (app: FastifyInstance): Promise<void> => {
  const ttlDays = (env as any).messageTtlDays ?? 14; 
  const ctxLimit = (env as any).messageContextLimit ?? 20;

  app.post(
    "/chat/message",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["message"],
          properties: {
            message: { type: "string", minLength: 1, maxLength: 20000 },
            conversationId: { type: "string", minLength: 1, maxLength: 120 },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = req.currentUserId;
      if (!userId) return reply.status(401).send({ error: "unauthorized" });

      const body = req.body as { message: string; conversationId?: string };
      const conversationId = body.conversationId ?? "default";

      const db = await getDb();

      // Scrub user message before storage
      const scrubbedUserMsg = scrubText(body.message);

      await createMessage(db, {
        userId,
        conversationId,
        role: "user",
        content: scrubbedUserMsg,
        ttlDays: ttlDays,
      });

      const placeholder = await createMessage(db, {
        userId,
        conversationId,
        role: "assistant",
        content: "processing",
        ttlDays: ttlDays,
      });

      // Async block for AI generation and state updates
      void (async () => {
        try {
          const recent = await listRecentMessages(db, userId, conversationId, ctxLimit);
          const context = recent
            .reverse()
            .map((m) => ({ role: m.role, content: m.content }));

          const out = await generateReply({
            requestId: placeholder.id,
            scrubbedMessage: scrubbedUserMsg,
            context,
          });

          const scrubbedReply = scrubText(out.scrubbedReply);
          
          // 1. Update the assistant message content
          await updateMessageContent(db, placeholder.id, scrubbedReply, ttlDays);

          // 2. Update conversation summary using the first 500 chars of the reply
          await upsertConversationSummary(db, {
            userId,
            conversationId,
            summaryText: scrubbedReply.slice(0, 500),
            ttlDays,
          });

          // 3. Update profile state (placeholder JSON for now)
          await upsertProfileState(db, {
            userId,
            stateJson: "{}",
            ttlDays,
          });

        } catch (err) {
          app.log.error({ err }, "reply_generation_failed");
          await updateMessageContent(db, placeholder.id, "error_generating_reply", ttlDays);
        }
      })();

      return {
        assistantMessageId: placeholder.id,
        conversationId,
        status: "queued",
      };
    },
  );

  // ... muut reitit (history, get by id) säilyvät ennallaan
  app.get(
    "/chat/history",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            conversationId: { type: "string", minLength: 1, maxLength: 120 },
            limit: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    async (req, reply) => {
      const userId = req.currentUserId;
      if (!userId) return reply.status(401).send({ error: "unauthorized" });

      const q = (req.query ?? {}) as Record<string, any>;
      const conversationId = q.conversationId ?? "default";
      const n = q.limit ? Number(q.limit) : 50;
      const limit = Number.isFinite(n) ? Math.min(Math.max(n, 1), 200) : 50;

      const db = await getDb();
      const rows = await listRecentMessages(db, userId, conversationId, limit);

      return rows.reverse().map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }));
    },
  );

  app.get(
    "/chat/message/:id",
    {
      schema: {
        params: {
          type: "object",
          additionalProperties: false,
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1, maxLength: 120 },
          },
        },
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
        content: row.content,
        createdAt: row.createdAt,
      };
    },
  );
};