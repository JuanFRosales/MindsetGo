import Fastify, { FastifyInstance } from "fastify";
import { registerErrorHandler } from "./middlewares/errorHandler.js";
import { healthRoutes } from "./routes/health.js";


export function buildApp(): FastifyInstance {
  const app = Fastify({ 
    logger: {
      // Cleaner development logs 
      transport: process.env.NODE_ENV === 'development' 
        ? { target: 'pino-pretty' } 
        : undefined 
    }
  });

  // Error Handling
  registerErrorHandler(app);

  // Plugin & Route Registration
  app.register(healthRoutes);

  return app;
}