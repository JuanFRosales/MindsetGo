import type { FastifyInstance } from "fastify";
import { getDb } from "../db/sqlite.ts";
import { env } from "../config/env.ts";
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  touchUser,
} from "../models/userRepo.ts";
import { emptyBodySchema, idString } from "../http/schemas.ts";

export const userRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // internal handler for user self-deletion
  const selfDeleteHandler = async (req: any, reply: any) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });

    const db = await getDb();

    try {
      // delete user and associated data via repo (handles transactions/cascades)
      const ok = await deleteUser(db, userId);
      
      if (!ok) {
        return reply.status(404).send({ error: "not_found" });
      }

      // expire session cookie to log out
      reply.setCookie(env.cookieName, "", {
        path: "/",
        expires: new Date(0),
        httpOnly: true,
      });

      return reply.status(200).send({ ok: true });
    } catch (e) {
      app.log.error({ err: e, userId }, "self_delete_failed");
      return reply.status(500).send({ error: "internal_error" });
    }
  };

  // self-delete via post (as required by test)
  app.post("/user/delete", { schema: { body: emptyBodySchema } }, selfDeleteHandler);
  
  // self-delete via delete (standard rest)
  app.delete("/users/me", selfDeleteHandler);

  // get current session user details
  app.get("/users/me", async (req, reply) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });

    const db = await getDb();
    const user = await getUserById(db, userId);
    
    if (!user) return reply.status(404).send({ error: "user not found" });
    
    await touchUser(db, userId);
    return user;
  });

  // register a new system user
  app.post("/users", { schema: { body: emptyBodySchema } }, async () => {
    const db = await getDb();
    return await createUser(db);
  });

  // list all users with optional limit
  app.get("/users", {
    schema: {
      querystring: {
        type: "object",
        properties: { limit: { type: "string", pattern: "^[0-9]+$" } },
      },
    },
  }, async (req, reply) => {
    const q = (req.query ?? {}) as Record<string, any>;
    const db = await getDb();
    const n = q.limit ? Number(q.limit) : 50;
    const limit = Number.isFinite(n) ? Math.min(Math.max(n, 1), 200) : 50;
    return await listUsers(db, limit);
  });

  // fetch user by specific id
  app.get("/users/:id", {
    schema: {
      params: {
        type: "object",
        required: ["id"],
        properties: { id: idString },
      },
    },
  }, async (req, reply) => {
    const db = await getDb();
    const { id } = req.params as { id: string };
    const user = await getUserById(db, id);
    if (!user) return reply.status(404).send({ error: "not_found" });
    await touchUser(db, id);
    return await getUserById(db, id) ?? user;
  });

  // administrative delete of any user
  app.delete("/users/:id", {
    schema: {
      params: {
        type: "object",
        required: ["id"],
        properties: { id: idString },
      },
    },
  }, async (req, reply) => {
    const db = await getDb();
    const { id } = req.params as { id: string };
    const ok = await deleteUser(db, id);
    if (!ok) return reply.status(404).send({ error: "not_found" });
    return reply.status(204).send();
  });
};