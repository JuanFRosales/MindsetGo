import Fastify from "fastify";
import { registerErrorHandler } from "./middlewares/errorHandler.ts";
import { healthRoutes } from "./routes/health.ts";
import { userRoutes } from "./routes/users.ts";

export const buildApp = () => {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === "development"
          ? { target: "pino-pretty" }
          : undefined
    }
  });

  // Error handling
  registerErrorHandler(app);

  // Routes
  app.register(healthRoutes);
  app.register(userRoutes);

  return app;
};
