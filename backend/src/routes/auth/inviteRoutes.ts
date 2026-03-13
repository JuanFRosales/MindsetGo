import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.ts";
import { getDb } from "../../db/sqlite.ts";
import { createInvite } from "../../models/inviteRepo.ts";
import { emptyBodySchema } from "./authSchemas.ts";
import { requireAdmin } from "./authHelpers.ts";

// Register routes for invitation code management
export const inviteRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // Endpoint to generate a new invitation code, restricted to admin key
  app.post(
    "/invites",
    { schema: { body: emptyBodySchema } },
    async (req, reply) => {
      // Direct header-based admin key check
      if (!requireAdmin(req, reply)) return;

      const db = await getDb();
      // Create a new code with the configured TTL (Time To Live)
      const invite = await createInvite(db, env.inviteTtlHours);

      return { code: invite.code, expiresAt: invite.expiresAt };
    },
  );
};