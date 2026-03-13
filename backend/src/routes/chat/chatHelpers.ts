import { scrubText } from "../../utils/piiScrubber.ts";

// Validate and pick allowed fields from a profile object
export const validateProfile = (v: any): any => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};

  const out: any = {};
  const { lang, goals, preferences, tone, updatedAt } = v;

  // Enforce type and length limits for each field
  if (typeof lang === "string" && lang.length <= 10) out.lang = lang;
  if (typeof goals === "string" && goals.length <= 200) out.goals = goals;
  if (typeof preferences === "string" && preferences.length <= 200) out.preferences = preferences;
  if (typeof tone === "string" && tone.length <= 50) out.tone = tone;
  if (typeof updatedAt === "number" && Number.isFinite(updatedAt)) out.updatedAt = updatedAt;

  return out;
};

// Recursively remove PII (Personally Identifiable Information) from all string values
export const scrubJsonValues = (v: unknown): unknown => {
  if (typeof v === "string") return scrubText(v);
  if (Array.isArray(v)) return v.map(scrubJsonValues);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) out[k] = scrubJsonValues(val);
    return out;
  }
  return v;
};

// Sanitize AI-generated "JSON-like" strings (removes markdown code blocks and fixes quotes)
export const normalizeJsonLike = (s: string): string => {
  let x = s.trim();
  // Strip markdown code fences (e.g., ```json ... ```)
  if (x.startsWith("```")) {
    x = x.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  // Convert single quotes to double quotes for keys and values
  x = x.replace(/:\s*'([^']*)'/g, (_m, v) => `: "${v}"`);
  x = x.replace(/'([^']*)'\s*:/g, (_m, k) => `"${k}":`);
  // Remove trailing commas before closing braces
  x = x.replace(/,\s*([}\]])/g, "$1");
  return x;
};

// Extract the first complete JSON object found within a larger string
export const extractJsonObject = (s: string): string | null => {
  const start = s.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  // Use bracket counting to find the actual end of the object
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
};