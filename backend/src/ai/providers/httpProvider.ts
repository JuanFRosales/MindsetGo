import type { AiProvider, GenerateReplyInput, GenerateReplyOutput } from "../types.ts";

// Creates an AI provider that communicates over HTTP
 
export const createHttpProvider = (opts: {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
}): AiProvider => {
  return {
    async generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput> {
      // Initialize controller for request cancellation
      const controller = new AbortController();

      // Forward external abort signals to the internal controller
      if (input.signal) {
        if (input.signal.aborted) controller.abort();
        else input.signal.addEventListener("abort", () => controller.abort(), { once: true });
      }

      // Set request timeout
      const t = setTimeout(() => controller.abort(), opts.timeoutMs);

      try {
        const res = await fetch(`${opts.baseUrl}/generate-reply`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            // Add authorization header if API key is provided
            ...(opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {}),
          },
          // Send input data while excluding the signal object from JSON
          body: JSON.stringify({ ...input, signal: undefined }),
          signal: controller.signal,
        });

        // Handle non-2xx HTTP responses
        if (!res.ok) throw new Error(`ai_http_provider_bad_status_${res.status}`);

        // Validate response payload structure
        const data = (await res.json()) as GenerateReplyOutput;
        if (!data?.scrubbedReply) throw new Error("ai_http_provider_invalid_payload");

        return data;
      } finally {
        // Always clear timeout to prevent memory leaks
        clearTimeout(t);
      }
    },
  };
};