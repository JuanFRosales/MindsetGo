import "dotenv/config";

// Require environment variables with optional fallbacks
const requireEnv = (key: string, fallback?: string): string => {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Missing env ${key}`);
  return v;
};

// Exported environment configuration
export const env = {
  // Server and DB
  isProd: (process.env.NODE_ENV ?? "development") === "production",
  port: Number(requireEnv("PORT", "3000")),
  dbPath: requireEnv("DB_PATH", "./data/app.db"),
  adminKey: requireEnv("ADMIN_KEY", "dev-admin-key"),
  cookieName: requireEnv("COOKIE_NAME", "sid"),

  // Cleanup Job
  ttlCron: process.env.TTL_CRON ?? "0 3 * * *",
  ttlEnabled: (process.env.TTL_ENABLED ?? "true") === "true",

  // Retention (Used records)
  usedRetentionHoursInviteCodes: Number(process.env.USED_RETENTION_HOURS_INVITE_CODES ?? "24"),
  usedRetentionHoursLoginProofs: Number(process.env.USED_RETENTION_HOURS_LOGIN_PROOFS ?? "1"),

  // TTL Settings (Expiration)
  userTtlDays: Number(requireEnv("USER_TTL_DAYS", "14")),
  inviteTtlHours: Number(requireEnv("INVITE_TTL_HOURS", "24")),
  sessionTtlMinutes: Number(requireEnv("SESSION_TTL_MINUTES", "15")),
  qrResolutionTtlMinutes: Number(process.env.QR_RESOLUTION_TTL_MINUTES ?? "5"),
  webauthnChallengeTtlMinutes: Number(process.env.WEBAUTHN_CHALLENGE_TTL_MINUTES ?? "5"),
  loginProofTtlMinutes: Number(process.env.LOGIN_PROOF_TTL_MINUTES ?? "5"),

  // WebAuthn
  rpId: requireEnv("RP_ID", "localhost"),
  rpName: requireEnv("RP_NAME", "Backend demo"),
  origin: requireEnv("ORIGIN", "http://localhost:3000"),
};