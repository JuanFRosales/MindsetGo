import type { FastifyInstance } from "fastify";
import type { AiMessage } from "../../ai/types.ts";
import { scrubJsonValues, extractJsonObject, normalizeJsonLike, validateProfile } from "./chatHelpers.ts";

// Log AI task performance metrics and execution status
export const logTask = (
  app: FastifyInstance,
  task: string,
  start: number,
  requestId: string,
  error?: any,
) => {
  app.log.info(
    {
      requestId,
      task,
      latencyMs: Math.round(performance.now() - start),
      ok: !error,
      errorName: error instanceof Error ? error.message : error ? "unknown_error" : undefined,
    },
    "ai_task_metrics",
  );
};

// Transform database rows into chronological context for the AI
export const buildContextFromRecentMessages = (
  recent: Array<{ role: AiMessage["role"]; content: string }>,
): AiMessage[] => {
  return recent.reverse().map((m) => ({ role: m.role, content: m.content }));
};

// Extract, normalize, and validate profile state from raw AI string output
export const parseProfileStateJson = (rawProfile: string): string => {
  let stateJson = "{}";

  try {
    const candidate0 = extractJsonObject(rawProfile) ?? rawProfile;
    const candidate = normalizeJsonLike(candidate0);
    const parsed = JSON.parse(candidate);
    const validated = validateProfile(scrubJsonValues(parsed));
    stateJson = JSON.stringify(validated);
  } catch {
    stateJson = "{}"; // Fallback to empty state on parsing error
  }

  return stateJson;
};