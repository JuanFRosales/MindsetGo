import type { AiProvider, GenerateReplyInput, GenerateReplyOutput } from "../types.ts";

export const localStubProvider: AiProvider = {
  async generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput> {
    const preview = input.scrubbedMessage.slice(0, 200);
    return {
      scrubbedReply: `Kuittaus. Sain viestin: ${preview}`,
    };
  },
};