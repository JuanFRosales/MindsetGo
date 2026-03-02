import { scrubText } from "../utils/piiScrubber.ts";
import type { MessageRow } from "../models/messageRepo.ts";
import type { AiMessage } from "./types.ts";
import { generateReply } from "./aiClient.ts";

export const generateConversationSummary = async (opts: {
  requestId: string;
  recentMessages: MessageRow[];
}): Promise<string> => {
  const ordered = opts.recentMessages.slice().sort((a, b) => a.createdAt - b.createdAt);

  const context: AiMessage[] = ordered.map((m) => ({
    role: m.role as "user" | "assistant",
    content: scrubText(m.content).slice(0, 1000),
  }));

  const prompt = "Tee tiivis yhteenveto keskustelusta, enintään 3 lausetta.";

  const out = await generateReply({
    requestId: opts.requestId,
    task: "summary",
    scrubbedMessage: prompt,
    context,
  });

  return out.scrubbedReply.slice(0, 1000);
};
