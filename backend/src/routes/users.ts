import type { FastifyInstance } from "fastify";
import { getDb } from "../db/sqlite.ts";
import { createUser, deleteUser, getUserById, listUsers, touchUser } from "../models/userRepo.ts";

export const userRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/users", async () => {
    const db = await getDb();
    const user = await createUser(db);
    return user;
  });

  app.get("/users", async (req) => {
    const db = await getDb();
    const q = req.query as { limit?: string };
    const limit = q.limit ? Number(q.limit) : 50;
    return await listUsers(db, Number.isFinite(limit) ? limit : 50);
  });

  app.get("/users/:id", async (req, reply) => {
    const db = await getDb();
    const { id } = req.params as { id: string };

    const user = await getUserById(db, id);
    if (!user) return reply.status(404).send({ error: "not_found" });

    await touchUser(db, id);

    const updated = await getUserById(db, id);
    return updated ?? user;
  });

  app.delete("/users/:id", async (req, reply) => {
    const db = await getDb();
    const { id } = req.params as { id: string };

    const ok = await deleteUser(db, id);
    if (!ok) return reply.status(404).send({ error: "not_found" });

    return reply.status(204).send();
  });
};
