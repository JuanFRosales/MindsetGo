import type { FastifyInstance } from "fastify";
import { getDb } from "../db/sqlite.ts";
import { env } from "../config/env.ts";
import {
  createUser,
  deleteUser,
  getUserById,
  touchUser,
} from "../models/userRepo.ts";
import { emptyBodySchema } from "../http/schemas.ts";

export const userRoutes = async (app: FastifyInstance): Promise<void> => {

  // internal handler for user self-deletion
  const selfDeleteHandler = async (req: any, reply: any) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });

    const db = await getDb();

    try {
      const ok = await deleteUser(db, userId);

      if (!ok) {
        return reply.status(404).send({ error: "not_found" });
      }

      // expire session cookie
      reply.setCookie(env.cookieName, "", {
        path: "/",
        expires: new Date(0),
        httpOnly: true,
      });

      return reply.status(200).send({ ok: true });

    } catch (e) {
      app.log.error({ err: e }, "self_delete_failed");
      return reply.status(500).send({ error: "internal_error" });
    }
  };

  // self-delete via POST (required by test)
  app.post("/user/delete", { schema: { body: emptyBodySchema } }, selfDeleteHandler);

  // self-delete via DELETE
  app.delete("/users/me", selfDeleteHandler);

  // get current session user
  app.get("/users/me", async (req, reply) => {
    const userId = req.currentUserId;
    if (!userId) return reply.status(401).send({ error: "unauthorized" });

    const db = await getDb();
    const user = await getUserById(db, userId);

    if (!user) return reply.status(404).send({ error: "user_not_found" });

    await touchUser(db, userId);
    return user;
  });

  // create a new user (used during onboarding)
  app.post("/users", { schema: { body: emptyBodySchema } }, async () => {
    const db = await getDb();
    return await createUser(db);
  });

};