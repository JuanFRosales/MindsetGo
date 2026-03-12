import { scrubText } from "../utils/piiScrubber.ts";
import type { MessageRow } from "../models/messageRepo.ts";
import type { AiMessage } from "./types.ts";
import { generateReply } from "./aiClient.ts";

// Generates a concise summary of the conversation history

export const generateConversationSummary = async (opts: {
  requestId: string;
  recentMessages: MessageRow[];
}): Promise<string> => {
  // Sort messages chronologically (oldest to newest)
  const ordered = opts.recentMessages.slice().sort((a, b) => a.createdAt - b.createdAt);

  // Map messages to AI format while scrubbing sensitive PII data
  const context: AiMessage[] = ordered.map((m) => ({
    role: m.role as "user" | "assistant",
    content: scrubText(m.content).slice(0, 1000),
  }));

  // Instruction for the AI to keep the summary brief
  const prompt = "Tee tiivis yhteenveto keskustelusta, enintään 3 lausetta.";

  // Request the summary from the AI provider
  const out = await generateReply({
    requestId: opts.requestId,
    task: "summary",
    scrubbedMessage: prompt,
    context,
  });

  // Return the summary, ensuring it doesn't exceed length limits
  return out.scrubbedReply.slice(0, 1000);
};