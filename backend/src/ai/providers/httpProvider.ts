import type { AiProvider, GenerateReplyInput, GenerateReplyOutput } from "../types.ts";

export const createHttpProvider = (opts: { baseUrl: string; apiKey?: string }): AiProvider => {
  return {
    async generateReply(input: GenerateReplyInput): Promise<GenerateReplyOutput> {
      const controller = new AbortController();
      const timeoutMs = 15_000;

      const t = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${opts.baseUrl}/generate-reply`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {}),
          },
          body: JSON.stringify(input),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`ai_http_provider_bad_status_${res.status}`);

        const data = (await res.json()) as GenerateReplyOutput;
        if (!data?.scrubbedReply) throw new Error("ai_http_provider_invalid_payload");

        return data;
      } finally {
        clearTimeout(t);
      }
    },
  };
};