import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { getDb } from "../db/sqlite.js";
import { createUser } from "../models/userRepo.js";
import { getValidInvite, markInviteUsed } from "../models/inviteRepo.js";
import { createQrLink, getQrLink, touchQrLink } from "../models/qrRepo.js";
import { createQrResolution } from "../models/qrResolutionRepo.ts";

type QrScanBody = {
  qrId?: string;
  inviteCode?: string;
};

// QR code login route
export const qrRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/qr/scan", async (req, reply) => {
    const { qrId: rawQrId, inviteCode: rawInviteCode } = req.body as QrScanBody;
    
    const qrId = rawQrId?.trim();
    const inviteCode = rawInviteCode?.trim();

    if (!qrId) {
      return reply.status(400).send({ error: "missing_qrId" });
    }

    const db = await getDb();

    // Check if QR link already exists
    const existing = await getQrLink(db, qrId);
    
    if (existing) {
      await touchQrLink(db, qrId);

      // Create a resolution instead of a session
      const resolution = await createQrResolution(db, qrId, existing.userId, 5);

      return { 
        userId: existing.userId, 
        resolutionId: resolution.id, 
        linked: true 
      };
    }

    // If no existing link, an invite code is required to create a new user
    if (!inviteCode) {
      return reply.status(400).send({ error: "missing_inviteCode" });
    }

    // Validate invite code and create new user and QR link
    const invite = await getValidInvite(db, inviteCode);
    if (!invite) {
      return reply.status(400).send({ error: "invalid_inviteCode" });
    }

    const user = await createUser(db, env.userTtlDays);
    await markInviteUsed(db, inviteCode, user.id);
    await createQrLink(db, qrId, user.id);

    // Create a resolution for the new user
    const resolution = await createQrResolution(db, qrId, user.id, 5);

    return { 
      userId: user.id, 
      resolutionId: resolution.id, 
      linked: false 
    };
  });
};