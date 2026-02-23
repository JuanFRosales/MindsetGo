import type { FastifyInstance } from "fastify";
import { getDb } from "../db/sqlite.ts";
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  touchUser,
} from "../models/userRepo.ts";
import { emptyBodySchema, idString } from "../http/schemas.ts";

export const userRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // Create a new user
  // Uses emptyBodySchema - works with empty POST requests thanks to preValidation hook
  app.post("/users", { schema: { body: emptyBodySchema } }, async () => {
    const db = await getDb();
    const user = await createUser(db);
    return user;
  });

  // List users with optional limit
  app.get(
    "/users",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            limit: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    async (req, reply) => {
      const q = (req.query ?? {}) as Record<string, any>;

      // Strict check: forbid unknown query parameters
      const allowed = new Set(["limit"]);
      for (const k of Object.keys(q)) {
        if (!allowed.has(k)) {
          return reply.status(400).send({ error: "bad_request" });
        }
      }

      const db = await getDb();
      const n = q.limit ? Number(q.limit) : 50;
      const limit = Number.isFinite(n) ? Math.min(Math.max(n, 1), 200) : 50;
      
      return await listUsers(db, limit);
    },
  );

  // Get single user and update last seen (touch)
  app.get(
    "/users/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          additionalProperties: false,
          properties: { id: idString },
        },
      },
    },
    async (req, reply) => {
      const db = await getDb();
      const { id } = req.params as { id: string };

      const user = await getUserById(db, id);
      if (!user) return reply.status(404).send({ error: "not_found" });

      // Update activity timestamp
      await touchUser(db, id);

      // Return the fresh state after touch
      const updated = await getUserById(db, id);
      return updated ?? user;
    },
  );

  // Delete user - returns 204 on success
  app.delete(
    "/users/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          additionalProperties: false,
          properties: { id: idString },
        },
      },
    },
    async (req, reply) => {
      const db = await getDb();
      const { id } = req.params as { id: string };

      const ok = await deleteUser(db, id);
      if (!ok) return reply.status(404).send({ error: "not_found" });

      return reply.status(204).send();
    },
  );
};