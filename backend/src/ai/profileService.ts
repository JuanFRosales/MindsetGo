import { env } from "../config/env.ts";
import { scrubText } from "../utils/piiScrubber.ts";
import type { MessageRow } from "../models/messageRepo.ts";
import type { AiMessage } from "./types.ts";
import { generateReply } from "./aiClient.ts";

// Generates an anonymized user profile based on message history
export const generateProfileState = async (opts: {
  requestId: string;
  recentMessages: MessageRow[];
  summaryText?: string;
}): Promise<string> => {
  // Sort messages by timestamp (oldest first)
  const ordered = opts.recentMessages.slice().sort((a, b) => 
    a.createdAt - b.createdAt
  );

  // Map user messages to AI context while scrubbing sensitive data
  const context: AiMessage[] = ordered
    .filter((m) => m.role === "user")
    .map((m) => ({ 
      role: "user", 
      content: scrubText(m.content).slice(0, 2000) 
    }));

  // Sanitize provided summary text
  const sanitizedSummary = scrubText(opts.summaryText ?? "").slice(0, 400);
  
  // Inject test flags into the prompt for error/PII scenario testing
  const failFlag = (env as any).testProfileFail ? " FAIL_PROFILE" : "";
  const piiFlag = (env as any).testProfilePii ? " PROFILE_PII" : "";
  
  // Construct a strict system prompt for JSON generation
  const prompt = [
    "Update user profile in JSON format.",
    "Return ONLY JSON.",
    "Fields: lang, goals, preferences, tone, updatedAt.",
    "Use only anonymized content.",
    `Current summary: ${sanitizedSummary || "None available."}${failFlag}${piiFlag}`,
  ].join("\n");

  // Call the AI provider to generate the profile
  const out = await generateReply({
    requestId: opts.requestId,
    task: "profile",
    scrubbedMessage: prompt,
    context,
  });

  return out.scrubbedReply.slice(0, 2000);
};