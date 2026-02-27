import type { FastifyInstance } from "fastify";
import { env } from "../config/env.ts";
import { getDb } from "../db/sqlite.ts";
import { scrubText } from "../utils/piiScrubber.ts";
import {
  createMessage,
  listRecentMessages,
  updateMessageContent,
  getMessageById,
} from "../models/messageRepo.ts";
import { generateReply } from "../ai/aiClient.ts";
import { upsertProfileState, getProfileState } from "../models/profileStateRepo.ts";
import { upsertConversationSummary, getConversationSummary } from "../models/conversationSummaryRepo.ts";
import { generateConversationSummary } from "../ai/summaryService.ts";
import { generateProfileState } from "../ai/profileService.ts";

// validate and constrain profile fields
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

// recursively scrub pii from json values
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

// fix common llm quirks in json strings
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

// extract first complete json block via brace counting
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

  // post new message and trigger async background tasks
  app.post("/chat/message", {
    schema: {
      body: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string", minLength: 1, maxLength: 20000 },
          conversationId: { type: "string", maxLength: 120 },
        },
      },
    },
  }, async (req, reply) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });

    const body = req.body as { message: string; conversationId?: string };
    const conversationId = body.conversationId ?? "default";
    const db = await getDb();
    const scrubbedUserMsg = scrubText(body.message);

    // save user message and placeholder for ai reply
    await createMessage(db, { userId, conversationId, role: "user", content: scrubbedUserMsg, ttlDays });
    const placeholder = await createMessage(db, { userId, conversationId, role: "assistant", content: "processing", ttlDays });

    // background tasks with independent error handling and metrics
    void (async () => {
      const db2 = await getDb();
      let summaryText: string | undefined;

      // internal helper for clean performance logging without pii or userids
      const logTask = (task: string, start: number, requestId: string, error?: any) => {
        app.log.info({
          requestId,
          task,
          latencyMs: Math.round(performance.now() - start),
          ok: !error,
          errorName: error instanceof Error ? error.message : error ? "unknown_error" : undefined
        }, "ai_task_metrics");
      };

      // phase 1: critical reply generation
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
        return; // stop execution if primary reply fails
      }

      // fetch latest state including the new assistant response
      const latest = await listRecentMessages(db2, userId, conversationId, ctxLimit);

      // phase 2: summary generation (soft fail)
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

      // phase 3: profile state update (soft fail)
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
  });

  // get latest summary for a conversation
  app.get("/chat/summary", async (req, reply) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });
    const q = (req.query ?? {}) as any;
    const db = await getDb();
    const row = await getConversationSummary(db, userId, q.conversationId ?? "default");
    return { summary: row ? scrubText(row.summaryText) : "" };
  });

  // get current user profile state
  app.get("/profile", async (req, reply) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });
    const db = await getDb();
    const row = await getProfileState(db, userId);
    const parsed = row ? JSON.parse(row.stateJson) : {};
    return scrubJsonValues(parsed);
  });

  // get message history
  app.get("/chat/history", async (req, reply) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });
    const q = (req.query ?? {}) as any;
    const db = await getDb();
    const rows = await listRecentMessages(db, userId, q.conversationId ?? "default", 50);
    return rows.reverse().map(m => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt }));
  });

  // get single message status
  app.get("/chat/message/:id", async (req, reply) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });
    const p = req.params as { id: string };
    const db = await getDb();
    const row = await getMessageById(db, userId, p.id);
    if (!row) return reply.status(404).send({ error: "not_found" });
    return { id: row.id, role: row.role, content: row.content, createdAt: row.createdAt };
  });
};