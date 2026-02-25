export type AiRole = "user" | "assistant";

export type AiMessage = {
  role: AiRole;
  content: string;
};

export type GenerateReplyInput = {
  requestId: string;
  scrubbedMessage: string;
  context: AiMessage[];
  summary?: string;
};

export type GenerateReplyOutput = {
  scrubbedReply: string;
};

export type AiProvider = {
  generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput>;
};