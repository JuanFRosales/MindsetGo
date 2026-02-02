import "dotenv/config";

// Helper to require environment variables 
function requireEnv(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (!v) {
    throw new Error(`[Config Error]: Missing required environment variable: ${key}`);
  }
  return v;
}

export const env = {
  // Ensure port for fastify 
  port: Number(requireEnv("PORT", "3000")),
  dbPath: requireEnv("DB_PATH", "./data/app.db"),
  nodeEnv: process.env.NODE_ENV || "development",
} as const; // read-only configuration object