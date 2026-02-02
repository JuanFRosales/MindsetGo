import "dotenv/config";

// Require environment variables with optional fallbacks
const requireEnv = (key: string, fallback?: string): string => {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Missing env ${key}`);
  return v;
};
// Exported environment configuration
export const env = {
  port: Number(requireEnv("PORT", "3000")),
  dbPath: requireEnv("DB_PATH", "./data/app.db"),

  adminKey: requireEnv("ADMIN_KEY", "dev-admin-key"),
  userTtlDays: Number(requireEnv("USER_TTL_DAYS", "14")),
  inviteTtlHours: Number(requireEnv("INVITE_TTL_HOURS", "24")),
  sessionTtlMinutes: Number(requireEnv("SESSION_TTL_MINUTES", "15")),
  cookieName: requireEnv("COOKIE_NAME", "sid"),
  ttlCron: process.env.TTL_CRON ?? "0 3 * * *",
  ttlEnabled: (process.env.TTL_ENABLED ?? "true") === "true",
  inviteUsedRetentionHours: Number(
    process.env.INVITE_USED_RETENTION_HOURS ?? "24",
  ),
};
