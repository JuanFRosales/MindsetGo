import { env } from "./config/env.ts";
import { buildApp } from "./app.ts";
import { registerTtlCleanupJob, runTtlCleanup } from "./jobs/ttlCleanup.ts";
import { migrate } from "./db/migrate.ts"; 
const app = buildApp();

// Register TTL cleanup job
registerTtlCleanupJob(app);

// Server start and shutdown handling
const start = async (): Promise<void> => {
  try {
    // 1. Aja migraatiot ennen palvelimen käynnistystä
    app.log.info("Running database migrations...");
    await migrate();
    app.log.info("Migrations completed successfully.");

    // 2. Start the server
    const address = await app.listen({
      port: env.port,
      host: "0.0.0.0"
    });

    app.log.info(`Server ready at ${address}`);

    // Run one cleanup pass on boot so dev and fresh deploys stay tidy
    await runTtlCleanup(app);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Handle unhandled rejections outside of Fastify
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "shutting down");

  try {
    await app.close();
  } catch (err) {
    app.log.error(err, "error during shutdown");
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

// Start
void start();