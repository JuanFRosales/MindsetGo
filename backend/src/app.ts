import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { registerErrorHandler } from "./middlewares/errorHandler.ts";
import { registerSessionAuth } from "./middlewares/sessionAuth.ts";
import { healthRoutes } from "./routes/health.ts";
import { userRoutes } from "./routes/users.ts";
import { authRoutes } from "./routes/auth.ts";
import { adminRoutes } from "./routes/admin.ts";
import { qrRoutes } from "./routes/qr.ts";
import { webauthnRoutes } from "./routes/webauthn.ts";
import staticPlugin from "@fastify/static";
import { join } from "node:path";
import { chatRoutes } from "./routes/chat.ts";
import { rateLimitPlugin } from "./plugins/rateLimit.ts";
import { env } from "./config/env.ts";

export const buildApp = () => {
  const app = Fastify({
    bodyLimit: env.maxRequestBytes,
    logger: {
      transport:
        process.env.NODE_ENV === "development"
          ? { target: "pino-pretty" }
          : undefined,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers['x-admin-key']",
          "req.body",
          "req.query",
          "req.params",
          "res.headers['set-cookie']"
        ],
        censor: "***"
      }
    },
  });

  app.addHook("preValidation", (req, _reply, done) => {
    const m = req.method;
    if (
      (m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE") &&
      req.body === undefined
    ) {
      (req as any).body = {};
    }
    done();
  });

  app.register(staticPlugin, {
    root: join(process.cwd(), "public"),
    prefix: "/"
  });

  app.register(cookie);

  registerErrorHandler(app);
  registerSessionAuth(app);

  // IMPORTANT: call directly so it attaches to root instance
  rateLimitPlugin(app);

  app.register(healthRoutes);
  app.register(userRoutes);
  app.register(authRoutes);
  app.register(adminRoutes);
  app.register(qrRoutes);
  app.register(webauthnRoutes);
  app.register(chatRoutes);

  return app;
};