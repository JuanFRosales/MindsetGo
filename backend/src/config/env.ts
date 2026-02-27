import "dotenv/config";

const requireEnv = (key: string, fallback?: string): string => {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Missing env ${key}`);
  return v;
};

const num = (key: string, fallback: string, min?: number): number => {
  const raw = requireEnv(key, fallback);
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Env ${key} must be a number`);
  if (min !== undefined && n < min)
    throw new Error(`Env ${key} must be >= ${min}`);
  return n;
};

const bool = (key: string, fallback: "true" | "false" = "false"): boolean => {
  const raw = (process.env[key] ?? fallback).toLowerCase();
  if (raw !== "true" && raw !== "false")
    throw new Error(`Env ${key} must be true or false`);
  return raw === "true";
};

export const env = {
  // server and db
  isProd: (process.env.NODE_ENV ?? "development") === "production",
  port: num("PORT", "3000", 1),
  dbPath: requireEnv("DB_PATH", "./data/app.db"),
  adminKey: requireEnv("ADMIN_KEY", "dev-admin-key"),
  cookieName: requireEnv("COOKIE_NAME", "sid"),
  // maximum allowed body size for incoming requests
  maxRequestBytes: num("MAX_REQUEST_BYTES", "50000", 1000),

  // cleanup job
  ttlCron: process.env.TTL_CRON ?? "0 3 * * *",
  ttlEnabled: bool("TTL_ENABLED", "true"),

  // retention for used records
  usedRetentionHoursInviteCodes: num(
    "USED_RETENTION_HOURS_INVITE_CODES",
    "24",
    0,
  ),
  usedRetentionHoursLoginProofs: num(
    "USED_RETENTION_HOURS_LOGIN_PROOFS",
    "24",
    0,
  ),

  // ttl settings
  userTtlDays: num("USER_TTL_DAYS", "14", 0),
  inviteTtlHours: num("INVITE_TTL_HOURS", "24", 0),
  sessionTtlMinutes: num("SESSION_TTL_MINUTES", "60", 0),

  qrResolutionTtlMinutes: num("QR_RESOLUTION_TTL_MINUTES", "5", 0),
  webauthnChallengeTtlMinutes: num("WEBAUTHN_CHALLENGE_TTL_MINUTES", "5", 0),
  loginProofTtlMinutes: num("LOGIN_PROOF_TTL_MINUTES", "5", 0),

  qrLinkRetentionHours: num("QR_LINK_RETENTION_HOURS", "336", 0),

  // webauthn
  rpId: requireEnv("RP_ID", "localhost"),
  rpName: requireEnv("RP_NAME", "Backend demo"),
  origin: requireEnv("ORIGIN", "http://localhost:3000"),

  // ai configuration
  aiMode: requireEnv("AI_MODE", "stub"),
  aiBaseUrl: process.env.AI_BASE_URL ?? "",
  aiApiKey: process.env.AI_API_KEY ?? "",
  aiTimeoutMs: num("AI_TIMEOUT_MS", "15000", 1000),

  // chat retention and context
  messageTtlDays: num("MESSAGE_TTL_DAYS", "14", 0),
  messageContextLimit: num("MESSAGE_CONTEXT_LIMIT", "20", 1),

  // ai testing flags
  testSummaryFail: bool("TEST_SUMMARY_FAIL", "false"),
  testProfileFail: bool("TEST_PROFILE_FAIL", "false"),
  testProfilePii: bool("TEST_PROFILE_PII", "false"),
};