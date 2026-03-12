import { env } from "../config/env.ts";
import type { AiProvider, GenerateReplyInput, GenerateReplyOutput } from "./types.ts";
import { localStubProvider } from "./providers/localStubProvider.ts";
import { createHttpProvider } from "./providers/httpProvider.ts";

// Selects the AI provider based on environment configuration

const selectProvider = (): AiProvider => {
  const mode = env.aiMode ?? "stub";

  // Use HTTP-based provider if configured
  if (mode === "http") {
    if (!env.aiBaseUrl) throw new Error("AI_BASE_URL_missing");
    return createHttpProvider({
      baseUrl: env.aiBaseUrl,
      apiKey: env.aiApiKey,
      timeoutMs: env.aiTimeoutMs,
    });
  }

  // Default to local stub for testing/development
  return localStubProvider;
};

/**
 * Main function to generate a reply using the selected provider
 */
export const generateReply = async (
  input: GenerateReplyInput,
): Promise<GenerateReplyOutput> => {
  const provider = selectProvider();

  // Setup local abort controller for handling timeouts
  const controller = new AbortController();
  const timeoutMs = env.aiTimeoutMs;

  // Sync external abort signal with the internal controller
  if (input.signal) {
    if (input.signal.aborted) controller.abort();
    else input.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  // Force abort if processing exceeds timeout limit
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Execute provider logic with the signal
    return await provider.generateReply({ ...input, signal: controller.signal });
  } catch (e) {
    // Identify if the error was caused by a timeout
    if (controller.signal.aborted) throw new Error("ai_timeout");
    throw e;
  } finally {
    // Cleanup timeout to prevent hanging process
    clearTimeout(t);
  }
};