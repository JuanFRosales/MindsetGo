import type { FastifyInstance } from "fastify";
import { env } from "../config/env.ts";
import { getDb } from "../db/sqlite.ts";
import { createUser } from "../models/userRepo.ts";
import { getInviteForLogin, markInviteUsed } from "../models/inviteRepo.ts";
import { createQrLink, getQrLink, touchQrLink } from "../models/qrRepo.ts";
import { createQrResolution } from "../models/qrResolutionRepo.ts";
import { idString } from "../http/schemas.ts";

type QrScanBody = {
  qrId?: string;
  inviteCode?: string;
};

export const qrRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post(
    "/qr/scan",
    {
      schema: {
        body: {
          type: "object",
          required: ["qrId"],
          additionalProperties: false,
          properties: {
            qrId: idString,
            inviteCode: idString,
          },
        },
      },
    },
    async (req, reply) => {
      const { qrId: rawQrId, inviteCode: rawInviteCode } = req.body as QrScanBody;

      if (!rawQrId) return reply.status(400).send({ error: "missing_qrId" });

      const qrId = rawQrId.trim();
      const inviteCode = rawInviteCode?.trim();

      const db = await getDb();

      const existing = await getQrLink(db, qrId);
      if (existing) {
        await touchQrLink(db, qrId);
        const resolution = await createQrResolution(db, qrId, existing.userId, 5);
        return { userId: existing.userId, resolutionId: resolution.id, linked: true };
      }

      if (!inviteCode) return reply.status(400).send({ error: "missing_inviteCode" });

      const invite = await getInviteForLogin(db, inviteCode);
      if (!invite) return reply.status(400).send({ error: "invalid_inviteCode" });

      let userId = invite.usedByUserId ?? null;

      if (!userId) {
        const user = await createUser(db, env.userTtlDays);
        userId = user.id;
        await markInviteUsed(db, inviteCode, userId);
      }

      await createQrLink(db, qrId, userId);

      const resolution = await createQrResolution(db, qrId, userId, 5);

      return { userId, resolutionId: resolution.id, linked: false };
    },
  );
};