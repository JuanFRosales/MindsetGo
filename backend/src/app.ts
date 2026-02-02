import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { registerErrorHandler } from "./middlewares/errorHandler.ts";
import { registerSessionAuth } from "./middlewares/sessionAuth.ts";
import { healthRoutes } from "./routes/health.ts";
import { userRoutes } from "./routes/users.ts";
import { authRoutes } from "./routes/auth.ts";

export const buildApp = () => {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === "development"
          ? { target: "pino-pretty" }
          : undefined,
    },
  });

  app.register(cookie);
  // Error handling
  registerErrorHandler(app);
  registerSessionAuth(app);

  // Routes
  app.register(healthRoutes);
  app.register(userRoutes);
  app.register(authRoutes);

  return app;
};
