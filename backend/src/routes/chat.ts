import type { FastifyInstance } from "fastify";
import { env } from "../config/env.ts";
import { getDb } from "../db/sqlite.ts";
import { scrubText } from "../utils/piiScrubber.ts";
import {
  createMessage,
  listRecentMessages,
  updateMessageContent,
  getMessageById,
  deleteMessageById,
  deleteConversationMessages,
} from "../models/messageRepo.ts";
import { generateReply } from "../ai/aiClient.ts";
import {
  upsertProfileState,
  getProfileState,
  deleteProfileState,
} from "../models/profileStateRepo.ts";
import {
  upsertConversationSummary,
  getConversationSummary,
  deleteConversationSummary,
} from "../models/conversationSummaryRepo.ts";
import { generateConversationSummary } from "../ai/summaryService.ts";
import { generateProfileState } from "../ai/profileService.ts";
import { emptyBodySchema, idString } from "../http/schemas.ts";

const validateProfile = (v: any): any => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};

  const out: any = {};
  const { lang, goals, preferences, tone, updatedAt } = v;

  if (typeof lang === "string" && lang.length <= 10) out.lang = lang;
  if (typeof goals === "string" && goals.length <= 200) out.goals = goals;
  if (typeof preferences === "string" && preferences.length <= 200) out.preferences = preferences;
  if (typeof tone === "string" && tone.length <= 50) out.tone = tone;
  if (typeof updatedAt === "number" && Number.isFinite(updatedAt)) out.updatedAt = updatedAt;

  return out;
};

const scrubJsonValues = (v: unknown): unknown => {
  if (typeof v === "string") return scrubText(v);
  if (Array.isArray(v)) return v.map(scrubJsonValues);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) out[k] = scrubJsonValues(val);
    return out;
  }
  return v;
};

const normalizeJsonLike = (s: string): string => {
  let x = s.trim();
  if (x.startsWith("```")) {
    x = x.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  x = x.replace(/:\s*'([^']*)'/g, (_m, v) => `: "${v}"`);
  x = x.replace(/'([^']*)'\s*:/g, (_m, k) => `"${k}":`);
  x = x.replace(/,\s*([}\]])/g, "$1");
  return x;
};

const extractJsonObject = (s: string): string | null => {
  const start = s.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
};

export const chatRoutes = async (app: FastifyInstance): Promise<void> => {
  const ttlDays = env.messageTtlDays;
  const ctxLimit = env.messageContextLimit;

  app.post(
    "/chat/message",
    {
      schema: {
        body: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string", minLength: 1, maxLength: env.chatMessageMaxLength },
            conversationId: { type: "string", maxLength: 120 },
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
      const scrubbedUserMsg = scrubText(body.message);

      await createMessage(db, { userId, conversationId, role: "user", content: scrubbedUserMsg, ttlDays });
      const placeholder = await createMessage(db, { userId, conversationId, role: "assistant", content: "processing", ttlDays });

      void (async () => {
        const db2 = await getDb();
        let summaryText: string | undefined;

        const logTask = (task: string, start: number, requestId: string, error?: any) => {
          app.log.info(
            {
              requestId,
              task,
              latencyMs: Math.round(performance.now() - start),
              ok: !error,
              errorName: error instanceof Error ? error.message : error ? "unknown_error" : undefined,
            },
            "ai_task_metrics",
          );
        };

        const startReply = performance.now();
        try {
          const recent = await listRecentMessages(db2, userId, conversationId, ctxLimit);
          const context = recent.reverse().map((m) => ({ role: m.role, content: m.content }));

          const out = await generateReply({
            requestId: placeholder.id,
            task: "reply",
            scrubbedMessage: scrubbedUserMsg,
            context,
          });

          await updateMessageContent(db2, placeholder.id, scrubText(out.scrubbedReply), ttlDays);
          logTask("reply", startReply, placeholder.id);
        } catch (e) {
          logTask("reply", startReply, placeholder.id, e);
          app.log.error({ err: e, requestId: placeholder.id }, "ai_reply_failed");
          await updateMessageContent(db2, placeholder.id, "error_generating_reply", ttlDays);
          return;
        }

        const latest = await listRecentMessages(db2, userId, conversationId, ctxLimit);

        const startSummary = performance.now();
        try {
          const rawSummary = await generateConversationSummary({
            requestId: `${placeholder.id}:summary`,
            recentMessages: latest,
          });
          summaryText = rawSummary.slice(0, 800);
          await upsertConversationSummary(db2, { userId, conversationId, summaryText, ttlDays });
          logTask("summary", startSummary, `${placeholder.id}:summary`);
        } catch (e) {
          logTask("summary", startSummary, `${placeholder.id}:summary`, e);
          app.log.error({ err: e, requestId: `${placeholder.id}:summary` }, "ai_summary_failed");
        }

        const startProfile = performance.now();
        try {
          const rawProfile = await generateProfileState({
            requestId: `${placeholder.id}:profile`,
            recentMessages: latest,
            summaryText,
          });

          let stateJson = "{}";
          try {
            const candidate0 = extractJsonObject(rawProfile) ?? rawProfile;
            const candidate = normalizeJsonLike(candidate0);
            const parsed = JSON.parse(candidate);
            const validated = validateProfile(scrubJsonValues(parsed));
            stateJson = JSON.stringify(validated);
          } catch {
            stateJson = "{}";
          }

          await upsertProfileState(db2, { userId, stateJson, ttlDays });
          logTask("profile", startProfile, `${placeholder.id}:profile`);
        } catch (e) {
          logTask("profile", startProfile, `${placeholder.id}:profile`, e);
          app.log.error({ err: e, requestId: `${placeholder.id}:profile` }, "ai_profile_failed");
        }
      })();

      return { assistantMessageId: placeholder.id, conversationId, status: "queued" };
    },
  );

  app.get("/chat/summary", async (req, reply) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });
    const q = (req.query ?? {}) as any;
    const db = await getDb();
    const row = await getConversationSummary(db, userId, q.conversationId ?? "default");
    return { summary: row ? scrubText(row.summaryText) : "" };
  });

  app.get("/profile", async (req, reply) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });
    const db = await getDb();
    const row = await getProfileState(db, userId);
    const parsed = row ? JSON.parse(row.stateJson) : {};
    return scrubJsonValues(parsed);
  });

  app.get("/chat/history", async (req, reply) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });
    const q = (req.query ?? {}) as any;
    const db = await getDb();
    const rows = await listRecentMessages(db, userId, q.conversationId ?? "default", ctxLimit);
    return rows
      .reverse()
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: scrubText(m.content),
        createdAt: m.createdAt,
      }));
  });

  app.get(
    "/chat/message/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: idString },
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
        content: scrubText(row.content),
        createdAt: row.createdAt,
      };
    },
  );

  app.delete(
    "/chat/message/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: idString },
        },
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

  app.post(
    "/chat/clear",
    { schema: { body: emptyBodySchema } },
    async (req, reply) => {
      const userId = req.currentUserId;
      if (!userId) return reply.status(401).send({ error: "unauthorized" });
      const q = (req.query ?? {}) as any;
      const conversationId = q.conversationId ?? "default";

      const db = await getDb();
      await deleteConversationMessages(db, userId, conversationId);
      await deleteConversationSummary(db, userId, conversationId);
      await deleteProfileState(db, userId);

      return reply.status(204).send();
    },
  );
};