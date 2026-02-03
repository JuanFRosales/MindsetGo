import type { FastifyInstance } from "fastify";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from "@simplewebauthn/server";
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from "@simplewebauthn/server";
import { createHash } from "node:crypto";
import { env } from "../config/env.ts";
import { getDb } from "../db/sqlite.ts";
import { getValidQrResolution } from "../models/qrResolutionRepo.ts";
import { createChallenge, getValidChallenge, deleteChallenge } from "../models/webauthnChallengeRepo.ts";
import { getPasskeyByUserId, upsertSinglePasskey, updateCounter } from "../models/passkeyRepo.ts";

const userIdToBytes = (userId: string): Uint8Array =>
  createHash("sha256").update(userId, "utf8").digest();

export const webauthnRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/webauthn/register/options", async (req, reply) => {
    const body = req.body as { resolutionId?: string };
    const resolutionId = body.resolutionId?.trim();
    if (!resolutionId) return reply.status(400).send({ error: "missing_resolutionId" });

    const db = await getDb();
    const resolution = await getValidQrResolution(db, resolutionId);
    if (!resolution) return reply.status(400).send({ error: "invalid_resolutionId" });

    const existing = await getPasskeyByUserId(db, resolution.userId);
    if (existing) return reply.status(409).send({ error: "passkey_already_exists" });

    const options = await generateRegistrationOptions({
      rpName: env.rpName,
      rpID: env.rpId,
      userID: userIdToBytes(resolution.userId),
      userName: resolution.userId,
      timeout: 60000,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred"
      }
    });

    const ch = await createChallenge(db, resolution.userId, "register", options.challenge, 5);

    return { challengeId: ch.id, options };
  });

  app.post("/webauthn/register/verify", async (req, reply) => {
    const body = req.body as { challengeId?: string; response?: RegistrationResponseJSON };
    const challengeId = body.challengeId?.trim();
    const response = body.response;
    if (!challengeId || !response) return reply.status(400).send({ error: "bad_request" });

    const db = await getDb();
    const ch = await getValidChallenge(db, challengeId, "register");
    if (!ch) return reply.status(400).send({ error: "invalid_challenge" });

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: env.origin,
      expectedRPID: env.rpId
    });

    if (!verification.verified || !verification.registrationInfo) {
      await deleteChallenge(db, ch.id);
      return reply.status(400).send({ error: "not_verified" });
    }

    const info = verification.registrationInfo;

    await upsertSinglePasskey(db, {
      userId: ch.userId,
      credentialId: Buffer.from(info.credentialID).toString("base64"),
      publicKey: Buffer.from(info.credentialPublicKey).toString("base64"),
      counter: info.counter,
      createdAt: Date.now()
    });

    await deleteChallenge(db, ch.id);

    return { ok: true, userId: ch.userId };
  });

  app.post("/webauthn/login/options", async (req, reply) => {
    const body = req.body as { userId?: string };
    const userId = body.userId?.trim();
    if (!userId) return reply.status(400).send({ error: "missing_userId" });

    const db = await getDb();
    const pk = await getPasskeyByUserId(db, userId);
    if (!pk) return reply.status(404).send({ error: "no_passkey" });

    const options = await generateAuthenticationOptions({
      rpID: env.rpId,
      timeout: 60000,
      userVerification: "preferred",
      allowCredentials: [
        {
          id: Buffer.from(pk.credentialId, "base64"),
          type: "public-key"
        }
      ]
    });

    const ch = await createChallenge(db, userId, "login", options.challenge, 5);

    return { challengeId: ch.id, options };
  });

  app.post("/webauthn/login/verify", async (req, reply) => {
    const body = req.body as { challengeId?: string; response?: AuthenticationResponseJSON };
    const challengeId = body.challengeId?.trim();
    const response = body.response;
    if (!challengeId || !response) return reply.status(400).send({ error: "bad_request" });

    const db = await getDb();
    const ch = await getValidChallenge(db, challengeId, "login");
    if (!ch) return reply.status(400).send({ error: "invalid_challenge" });

    const pk = await getPasskeyByUserId(db, ch.userId);
    if (!pk) {
      await deleteChallenge(db, ch.id);
      return reply.status(404).send({ error: "no_passkey" });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: env.origin,
      expectedRPID: env.rpId,
      authenticator: {
        credentialID: Buffer.from(pk.credentialId, "base64"),
        credentialPublicKey: Buffer.from(pk.publicKey, "base64"),
        counter: pk.counter
      }
    });

    await deleteChallenge(db, ch.id);

    if (!verification.verified) return reply.status(400).send({ error: "not_verified" });

    await updateCounter(db, ch.userId, verification.authenticationInfo.newCounter);

    return { ok: true, userId: ch.userId };
  });
};
