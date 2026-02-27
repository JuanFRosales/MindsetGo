import { env } from "../config/env.ts";
import { scrubText } from "../utils/piiScrubber.ts";
import type { MessageRow } from "../models/messageRepo.ts";
import type { AiMessage } from "./types.ts";
import { generateReply } from "./aiClient.ts";

export const generateProfileState = async (opts: {
  requestId: string;
  recentMessages: MessageRow[];
  summaryText?: string;
}): Promise<string> => {
  // sort messages chronologically
  const ordered = opts.recentMessages.slice().sort((a, b) => 
    a.createdAt - b.createdAt
  );

  const context: AiMessage[] = ordered
    .filter((m) => m.role === "user")
    .map((m) => ({ 
      role: "user", 
      content: scrubText(m.content).slice(0, 2000) 
    }));

  const sanitizedSummary = scrubText(opts.summaryText ?? "").slice(0, 400);
  
  // flags for testing error handling and pii scrubbing
  const failFlag = (env as any).testProfileFail ? " FAIL_PROFILE" : "";
  const piiFlag = (env as any).testProfilePii ? " PROFILE_PII" : "";
  
  const prompt = [
    "Update user profile in JSON format.",
    "Return ONLY JSON.",
    "Fields: lang, goals, preferences, tone, updatedAt.",
    "Use only anonymized content.",
    `Current summary: ${sanitizedSummary || "None available."}${failFlag}${piiFlag}`,
  ].join("\n");

  const out = await generateReply({
    requestId: opts.requestId,
    task: "profile",
    scrubbedMessage: prompt,
    context,
  });

  return out.scrubbedReply.slice(0, 2000);
};