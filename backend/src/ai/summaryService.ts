import type { GenerateReplyInput } from "./types.ts";
import { generateReply } from "./aiClient.ts";
import { scrubText, scrubMessages } from "../utils/piiScrubber.ts";
import type { MessageRow } from "../models/messageRepo.ts";

export const buildContextText = (messages: MessageRow[]): string => {
  // ordering messages by createdAt to ensure correct sequence, then building a text block with role and content
  const ordered = messages.slice().sort((a, b) => a.createdAt - b.createdAt);
  const parts = ordered.map((m) => `${m.role}: ${m.content}`);
  const joined = parts.join("\n");
  // truncate overly long threads before sending
  return scrubText(joined).slice(0, 4000);
};

export const generateConversationSummary = async (opts: {
  requestId: string;
  recentMessages: MessageRow[];
}): Promise<string> => {
  const contextText = buildContextText(opts.recentMessages);

  const input: GenerateReplyInput = {
    requestId: opts.requestId,
    // signal to the AI provider that we want a conversation summary
    scrubbedMessage: "__generate_conversation_summary__",
    // providing the recent messages as context for the summary generation
    context: [{ role: "user", content: contextText }],
  };

  const out = await generateReply(input);
  // final scrub to ensure no sensitive info slips through
  return scrubText(out.scrubbedReply).slice(0, 2000);
};