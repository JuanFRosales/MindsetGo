import { env } from "../config/env.ts";
import type { AiProvider, GenerateReplyInput, GenerateReplyOutput } from "./types.ts";
import { localStubProvider } from "./providers/localStubProvider.ts";
import { createHttpProvider } from "./providers/httpProvider.ts";

const selectProvider = (): AiProvider => {
  const mode = env.aiMode ?? "stub";

  if (mode === "http") {
    if (!env.aiBaseUrl) throw new Error("AI_BASE_URL_missing");
    return createHttpProvider({ baseUrl: env.aiBaseUrl, apiKey: env.aiApiKey });
  }

  return localStubProvider;
};

export const generateReply = async (input: GenerateReplyInput): Promise<GenerateReplyOutput> => {
  const provider = selectProvider();
  return provider.generateReply(input);
};