import type { FastifyInstance } from "fastify";
import { getDb } from "../../db/sqlite.ts";
import { scrubText } from "../../utils/piiScrubber.ts";
import {
  listRecentMessages,
  updateMessageContent,
} from "../../models/messageRepo.ts";
import { generateReply } from "../../ai/aiClient.ts";
import { upsertProfileState } from "../../models/profileStateRepo.ts";
import { upsertConversationSummary } from "../../models/conversationSummaryRepo.ts";
import { generateConversationSummary } from "../../ai/summaryService.ts";
import { generateProfileState } from "../../ai/profileService.ts";
import {
  buildContextFromRecentMessages,
  logTask,
  parseProfileStateJson,
} from "./messageHelpers.ts";

type ProcessMessageInBackgroundParams = {
  userId: string;
  conversationId: string;
  scrubbedUserMsg: string;
  placeholderId: string;
  ttlDays: number;
  ctxLimit: number;
};

// Orchestrate asynchronous AI tasks: reply generation, summarization, and profile updating
export const processMessageInBackground = async (
  app: FastifyInstance,
  {
    userId,
    conversationId,
    scrubbedUserMsg,
    placeholderId,
    ttlDays,
    ctxLimit,
  }: ProcessMessageInBackgroundParams,
): Promise<void> => {
  const db = await getDb();
  let summaryText: string | undefined;

  // Generate the assistant's reply
  const startReply = performance.now();
  try {
    const recent = await listRecentMessages(db, userId, conversationId, ctxLimit);
    const context = buildContextFromRecentMessages(recent);

    const out = await generateReply({
      requestId: placeholderId,
      task: "reply",
      scrubbedMessage: scrubbedUserMsg,
      context,
    });

    // Replace the "processing" placeholder with the actual AI response
    await updateMessageContent(db, placeholderId, scrubText(out.scrubbedReply), ttlDays);
    logTask(app, "reply", startReply, placeholderId);
  } catch (e) {
    logTask(app, "reply", startReply, placeholderId, e);
    app.log.error({ err: e, requestId: placeholderId }, "ai_reply_failed");
    await updateMessageContent(db, placeholderId, "error_generating_reply", ttlDays);
    return; // Abort further tasks if the primary reply fails
  }

  // Fetch updated history including the new assistant reply for context
  const latest = await listRecentMessages(db, userId, conversationId, ctxLimit);

  // Update conversation summary
  const startSummary = performance.now();
  try {
    const rawSummary = await generateConversationSummary({
      requestId: `${placeholderId}:summary`,
      recentMessages: latest,
    });
    summaryText = rawSummary.slice(0, 800);
    await upsertConversationSummary(db, { userId, conversationId, summaryText, ttlDays });
    logTask(app, "summary", startSummary, `${placeholderId}:summary`);
  } catch (e) {
    logTask(app, "summary", startSummary, `${placeholderId}:summary`, e);
    app.log.error({ err: e, requestId: `${placeholderId}:summary` }, "ai_summary_failed");
  }

  // Update user profile state based on the new interaction
  const startProfile = performance.now();
  try {
    const rawProfile = await generateProfileState({
      requestId: `${placeholderId}:profile`,
      recentMessages: latest,
      summaryText,
    });

    const stateJson = parseProfileStateJson(rawProfile);

    await upsertProfileState(db, { userId, stateJson, ttlDays });
    logTask(app, "profile", startProfile, `${placeholderId}:profile`);
  } catch (e) {
    logTask(app, "profile", startProfile, `${placeholderId}:profile`, e);
    app.log.error({ err: e, requestId: `${placeholderId}:profile` }, "ai_profile_failed");
  }
};