import type { FastifyInstance } from "fastify";
import { getDb } from "../../db/sqlite.ts";
import { listUsers, getUserById } from "../../models/userRepo.ts";
import { listConversationSummariesByUserId } from "../../models/conversationSummaryRepo.ts";
import { requireAdminSession } from "../../middlewares/adminSessionAuth.ts";
import { adminUserIdParamsSchema, adminUsersQuerySchema } from "./adminSchemas.ts";
import { sendProfileStateNotFound, sendUserNotFound } from "./adminResponses.ts";

// Register routes for retrieving user data for the admin panel
export const adminUserReadRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // List users with a configurable limit (default 50, max 200)
  app.get(
    "/admin/users",
    {
      preHandler: requireAdminSession,
      schema: {
        querystring: adminUsersQuerySchema,
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

  // Get basic information for a specific user
  app.get(
    "/admin/users/:id",
    {
      preHandler: requireAdminSession,
      schema: {
        params: adminUserIdParamsSchema,
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

  // Fetch all chat history for a specific user, ordered chronologically
  app.get(
    "/admin/users/:id/messages",
    {
      preHandler: requireAdminSession,
      schema: {
        params: adminUserIdParamsSchema,
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

  // Retrieve the latest AI-generated profile state for a user
  app.get(
    "/admin/users/:id/profile-state",
    {
      preHandler: requireAdminSession,
      schema: {
        params: adminUserIdParamsSchema,
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

      // Try to parse JSON for a structured response, fallback to raw string
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

  // List all AI-generated conversation summaries for a specific user
  app.get(
    "/admin/users/:id/summaries",
    {
      preHandler: requireAdminSession,
      schema: {
        params: adminUserIdParamsSchema,
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
};