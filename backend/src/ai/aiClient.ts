import { env } from "../config/env.ts";
import type { AiProvider, GenerateReplyInput, GenerateReplyOutput } from "./types.ts";
import { localStubProvider } from "./providers/localStubProvider.ts";
import { createHttpProvider } from "./providers/httpProvider.ts";

const selectProvider = (): AiProvider => {
  const mode = env.aiMode ?? "stub";

  if (mode === "http") {
    if (!env.aiBaseUrl) throw new Error("AI_BASE_URL_missing");
    return createHttpProvider({
      baseUrl: env.aiBaseUrl,
      apiKey: env.aiApiKey,
      timeoutMs: env.aiTimeoutMs,
    });
  }

  return localStubProvider;
};

export const generateReply = async (
  input: GenerateReplyInput,
): Promise<GenerateReplyOutput> => {
  const provider = selectProvider();

  const controller = new AbortController();
  const timeoutMs = env.aiTimeoutMs;

  if (input.signal) {
    if (input.signal.aborted) controller.abort();
    else input.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await provider.generateReply({ ...input, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) throw new Error("ai_timeout");
    throw e;
  } finally {
    clearTimeout(t);
  }
};
