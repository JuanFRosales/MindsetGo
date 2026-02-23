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

export const buildApp = () => {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === "development"
          ? { target: "pino-pretty" }
          : undefined,
      // Redact sensitive information from logs
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers['x-admin-key']",
          "req.body",          // Redact entire request body
          "req.query",         // Redact all query parameters
          "req.params",        // Redact all URL parameters
          "res.headers['set-cookie']" // Redact outgoing cookies
        ],
        censor: "***" // Mask value
      }
    },
  });

  // Global hook to prevent validation errors when body is missing
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

  // Static files
  app.register(staticPlugin, {
    root: join(process.cwd(), "public"),
    prefix: "/"
  });

  app.register(cookie);
  
  // Error handling
  registerErrorHandler(app);
  registerSessionAuth(app);

  // Routes
  app.register(healthRoutes);
  app.register(userRoutes);
  app.register(authRoutes);
  app.register(adminRoutes);
  app.register(qrRoutes);
  app.register(webauthnRoutes);

  return app;
};