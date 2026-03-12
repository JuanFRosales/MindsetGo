import type { FastifyInstance, FastifyReply } from "fastify";
import { env } from "../config/env.ts";
import { getDb } from "../db/sqlite.ts";
import { emptyBodySchema, idString } from "../http/schemas.ts";
import { runTtlCleanup } from "../jobs/ttlCleanup.ts";
import { listUsers, getUserById, deleteUser } from "../models/userRepo.ts";
import { createInvite } from "../models/inviteRepo.ts";
import { listConversationSummariesByUserId } from "../models/conversationSummaryRepo.ts";
import {
  cleanupExpiredAdminSessions,
  createAdminSession,
  deleteAdminSession,
  getAdminSession,
} from "../utils/adminSessions.ts";
import { requireAdminSession } from "../middlewares/adminSessionAuth.ts";

const sendError = (
  reply: FastifyReply,
  statusCode: number,
  error: string,
  message: string,
) => {
  return reply.status(statusCode).send({ error, message });
};

const sendUserNotFound = (reply: FastifyReply) => {
  return sendError(reply, 404, "user_not_found", "User not found");
};

const sendProfileStateNotFound = (reply: FastifyReply) => {
  return sendError(reply, 404, "profile_state_not_found", "Profile state not found");
};

const sendInvalidAdminKey = (reply: FastifyReply) => {
  return sendError(reply, 401, "invalid_admin_key", "Invalid admin key");
};

const sendMissingAdminSession = (reply: FastifyReply) => {
  return sendError(reply, 401, "admin_session_missing", "Admin session is missing");
};

const sendInvalidAdminSession = (reply: FastifyReply) => {
  return sendError(reply, 401, "admin_session_invalid", "Admin session is invalid");
};

const sendExpiredAdminSession = (reply: FastifyReply) => {
  return sendError(reply, 401, "admin_session_expired", "Admin session has expired");
};

export const adminRoutes = async (app: FastifyInstance): Promise<void> => {
  // Auth

  app.post("/admin/login", async (req, reply) => {
    await cleanupExpiredAdminSessions();

    const body = req.body as { key?: string };
    const key = body?.key?.trim();

    if (!key || key !== env.adminKey) {
      return sendInvalidAdminKey(reply);
    }

    const sessionId = await createAdminSession();

    reply.setCookie(env.adminCookieName, sessionId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProd,
    });

    return reply.send({ ok: true, admin: true });
  });

  app.get("/admin/me", async (req, reply) => {
    const sid = req.cookies?.[env.adminCookieName];
    if (!sid) {
      return sendMissingAdminSession(reply);
    }

    const session = await getAdminSession(sid);
    if (!session) {
      return sendInvalidAdminSession(reply);
    }

    if (session.expiresAt <= Date.now()) {
      await deleteAdminSession(sid);
      reply.clearCookie(env.adminCookieName, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: env.isProd,
      });

      return sendExpiredAdminSession(reply);
    }

    return reply.send({ admin: true });
  });

  app.post("/admin/logout", async (req, reply) => {
    const sid = req.cookies?.[env.adminCookieName];
    if (sid) await deleteAdminSession(sid);

    reply.clearCookie(env.adminCookieName, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProd,
    });

    return reply.status(204).send();
  });

  // Maintenance

  app.post(
    "/admin/cleanup",
    {
      preHandler: requireAdminSession,
      schema: { body: emptyBodySchema },
    },
    async (_req, reply) => {
      const result = await runTtlCleanup(app);
      return reply.send(result);
    },
  );

  app.post(
    "/admin/invites",
    {
      preHandler: requireAdminSession,
      schema: { body: emptyBodySchema },
    },
    async (_req, reply) => {
      const db = await getDb();
      const invite = await createInvite(db, env.inviteTtlHours);

      return reply.status(201).send({
        code: invite.code,
        expiresAt: new Date(invite.expiresAt).toISOString(),
      });
    },
  );

  app.post(
    "/admin/expire-test-data",
    {
      preHandler: requireAdminSession,
      schema: { body: emptyBodySchema },
    },
    async (_req, reply) => {
      const db = await getDb();
      const now = Date.now();
      const past = now - 1000;

      await db.run("UPDATE sessions SET expiresAt = ?", past);
      await db.run("UPDATE invite_codes SET expiresAt = ?", past);
      await db.run("UPDATE login_proofs SET expiresAt = ?", past);
      await db.run("UPDATE qr_resolutions SET expiresAt = ?", past);
      await db.run("UPDATE webauthn_challenges SET expiresAt = ?", past);

      const qrLinkRetentionMs = env.qrLinkRetentionHours * 60 * 60 * 1000;
      await db.run("UPDATE qr_links SET lastSeenAt = ?", now - qrLinkRetentionMs - 1000);

      const inviteRetentionMs = (env.usedRetentionHoursInviteCodes + 1) * 60 * 60 * 1000;
      const proofRetentionMs = (env.usedRetentionHoursLoginProofs + 1) * 60 * 60 * 1000;

      await db.run(
        "UPDATE invite_codes SET usedAt = ? WHERE usedAt IS NOT NULL",
        now - inviteRetentionMs,
      );
      await db.run(
        "UPDATE login_proofs SET usedAt = ? WHERE usedAt IS NOT NULL",
        now - proofRetentionMs,
      );

      try {
        await db.run("UPDATE users SET expiresAt = ?", past);
      } catch {
        app.log.debug("users.expiresAt not present");
      }

      return reply.send({ status: "ok" });
    },
  );

  // Diagnostics

  app.get("/admin/db-info", { preHandler: requireAdminSession }, async (_req, reply) => {
    const db = await getDb();
    const database = await db.all("PRAGMA database_list;");
    const foreignKeys = await db.get("PRAGMA foreign_keys;");

    return reply.send({ database, foreignKeys });
  });

  app.get("/admin/db-counts", { preHandler: requireAdminSession }, async (_req, reply) => {
    const db = await getDb();
    const counts: Record<string, number | string> = {};
    const tables = [
      "users",
      "invite_codes",
      "sessions",
      "qr_links",
      "qr_resolutions",
      "passkeys",
      "webauthn_challenges",
      "login_proofs",
      "conversation_summary",
      "messages",
      "profile_state",
    ];

    for (const table of tables) {
      try {
        const row = await db.get<{ c: number }>(`SELECT COUNT(*) as c FROM ${table}`);
        counts[table] = row?.c ?? 0;
      } catch {
        counts[table] = "missing_table";
      }
    }

    return reply.send({ counts });
  });

  // User reads

  app.get(
    "/admin/users",
    {
      preHandler: requireAdminSession,
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            limit: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    async (req, reply) => {
      const q = (req.query ?? {}) as Record<string, unknown>;
      const db = await getDb();
      const rawLimit = typeof q.limit === "string" ? Number(q.limit) : 50;
      const limit = Math.min(Math.max(rawLimit, 1), 200);

      const users = await listUsers(db, limit);
      return reply.send(users);
    },
  );

  app.get(
    "/admin/users/:id",
    {
      preHandler: requireAdminSession,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: idString },
        },
      },
    },
    async (req, reply) => {
      const db = await getDb();
      const { id } = req.params as { id: string };
      const user = await getUserById(db, id);

      if (!user) {
        return sendUserNotFound(reply);
      }

      return reply.send(user);
    },
  );

  app.get(
    "/admin/users/:id/messages",
    {
      preHandler: requireAdminSession,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: idString },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const db = await getDb();

      const rows = await db.all(
        `
          SELECT id, role, content, createdAt
          FROM messages
          WHERE userId = ?
          ORDER BY createdAt ASC
        `,
        id,
      );

      return reply.send(rows);
    },
  );

  app.get(
    "/admin/users/:id/profile-state",
    {
      preHandler: requireAdminSession,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: idString },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const db = await getDb();

      const row = await db.get(
        `
          SELECT userId, stateJson, createdAt, lastActiveAt
          FROM profile_state
          WHERE userId = ?
          ORDER BY createdAt DESC
          LIMIT 1
        `,
        id,
      );

      if (!row) {
        return sendProfileStateNotFound(reply);
      }

      let parsedState: unknown = null;
      try {
        parsedState = JSON.parse(row.stateJson);
      } catch {
        parsedState = row.stateJson;
      }

      return reply.send({
        userId: row.userId,
        state: parsedState,
        createdAt: row.createdAt,
        updatedAt: row.lastActiveAt ?? null,
      });
    },
  );

  app.get(
    "/admin/users/:id/summaries",
    {
      preHandler: requireAdminSession,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: idString },
        },
      },
    },
    async (req, reply) => {
      const db = await getDb();
      const { id } = req.params as { id: string };
      const user = await getUserById(db, id);

      if (!user) {
        return sendUserNotFound(reply);
      }

      const summaries = await listConversationSummariesByUserId(db, id);
      return reply.send({ items: summaries });
    },
  );

  // User resets

  app.post(
    "/admin/users/:id/reset-passkeys",
    {
      preHandler: requireAdminSession,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: idString },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const db = await getDb();

      await db.run("DELETE FROM passkeys WHERE userId = ?", id);
      await db.run("DELETE FROM webauthn_challenges WHERE userId = ?", id);

      return reply.send({ ok: true, userId: id });
    },
  );

  // User deletes

  app.delete(
    "/admin/users/:id/profile-state",
    {
      preHandler: requireAdminSession,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: idString },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const db = await getDb();

      await db.run("DELETE FROM profile_state WHERE userId = ?", id);

      return reply.send({ ok: true, userId: id });
    },
  );

  app.delete(
    "/admin/users/:id/summaries",
    {
      preHandler: requireAdminSession,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: idString },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const db = await getDb();

      await db.run("DELETE FROM conversation_summary WHERE userId = ?", id);

      return reply.send({ ok: true, userId: id });
    },
  );

  app.delete(
    "/admin/users/:id",
    {
      preHandler: requireAdminSession,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: idString },
        },
      },
    },
    async (req, reply) => {
      const db = await getDb();
      const { id } = req.params as { id: string };
      const ok = await deleteUser(db, id);

      if (!ok) {
        return sendUserNotFound(reply);
      }

      return reply.status(204).send();
    },
  );
};