import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../../config/env.ts";

// Check for production environment to enforce secure cookies
const isProd = process.env.NODE_ENV === "production";

// Middleware-like helper to verify the admin master key from headers
export const requireAdmin = (req: FastifyRequest, reply: FastifyReply): boolean => {
  const key = req.headers["x-admin-key"];
  if (key !== env.adminKey) {
    reply.status(401).send({ error: "unauthorized" });
    return false;
  }
  return true;
};

// Configure and set the user session cookie with security best practices
export const setSessionCookie = (reply: FastifyReply, sessionId: string) => {
  reply.setCookie(env.cookieName, sessionId, {
    httpOnly: true, // Prevents client-side JS access
    sameSite: "lax", // Protects against CSRF in common scenarios
    secure: isProd, // Requires HTTPS in production
    path: "/",
    maxAge: env.sessionTtlMinutes * 60, // Expiration in seconds
  });
};

// Remove the session cookie by clearing it from the client
export const clearSessionCookie = (reply: FastifyReply) => {
  reply.clearCookie(env.cookieName, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
  });
};