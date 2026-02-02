import { env } from "./config/env.js";
import { buildApp } from "./app.js";

const app = buildApp();


 // Server start and shutdown handling

async function start() {
  try {
    const address = await app.listen({ 
      port: env.port, 
      host: "0.0.0.0" 
    });
    
    app.log.info(`Server ready at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Handle unhandled rejections outside of Fastify
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});

start();