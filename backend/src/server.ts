import { env } from "./config/env.ts";
import { buildApp } from "./app.ts";
import { registerTtlCleanupJob, runTtlCleanup } from "./jobs/ttlCleanup.ts";

const app = buildApp();

// Register TTL cleanup job
registerTtlCleanupJob(app);

// Server start and shutdown handling
const start = async (): Promise<void> => {
  try {
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

// Graceful shutdown for future use in deployment environments
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

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);


// Start
void start();
