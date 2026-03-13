import type { FastifyInstance } from "fastify";
import { getDb } from "../../db/sqlite.ts";
import { deleteUser } from "../../models/userRepo.ts";
import { requireAdminSession } from "../../middlewares/adminSessionAuth.ts";
import { adminUserIdParamsSchema } from "./adminSchemas.ts";
import { sendUserNotFound } from "./adminResponses.ts";

// Register routes for modifying or deleting user-specific data
export const adminUserMutationRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // Wipe passkeys and active challenges to allow user to re-register
  app.post(
    "/admin/users/:id/reset-passkeys",
    {
      preHandler: requireAdminSession,
      schema: {
        params: adminUserIdParamsSchema,
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

  // Remove AI-generated profile state for a specific user
  app.delete(
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

      await db.run("DELETE FROM profile_state WHERE userId = ?", id);

      return reply.send({ ok: true, userId: id });
    },
  );

  // Delete all conversation summaries associated with a user
  app.delete(
    "/admin/users/:id/summaries",
    {
      preHandler: requireAdminSession,
      schema: {
        params: adminUserIdParamsSchema,
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const db = await getDb();

      await db.run("DELETE FROM conversation_summary WHERE userId = ?", id);

      return reply.send({ ok: true, userId: id });
    },
  );

  // Permanently delete a user and all cascaded data
  app.delete(
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
      const ok = await deleteUser(db, id);

      if (!ok) {
        return sendUserNotFound(reply);
      }

      return reply.status(204).send();
    },
  );
};