import type { FastifyPluginAsync } from "fastify";
import { Fido2Lib } from "fido2-lib";
import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import { getDb } from "../db/sqlite.js";
import { getValidQrResolution } from "../models/qrResolutionRepo.js";
import {
  createChallenge,
  getValidChallenge,
  deleteChallenge,
} from "../models/webauthnChallengeRepo.js";
import {
  getPasskeyByUserId,
  upsertSinglePasskey,
  updateCounter,
} from "../models/passkeyRepo.js";

const DASH = String.fromCharCode(45);

const userIdToBytes = (userId: string): Uint8Array =>
  createHash("sha256").update(userId, "utf8").digest();

const padB64 = (s: string): string => {
  const pad = (4 - (s.length % 4)) % 4;
  return s + "=".repeat(pad);
};

const b64uToArrayBuffer = (s: string): ArrayBuffer => {
  const b64 = padB64(
    s.replace(new RegExp(DASH, "g"), "+").replace(/_/g, "/"),
  );
  const buf = Buffer.from(b64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};

const bufLikeToB64u = (b: ArrayBuffer | Uint8Array | Buffer): string => {
  const u8 =
    b instanceof ArrayBuffer
      ? new Uint8Array(b)
      : Buffer.isBuffer(b)
        ? b
        : new Uint8Array(b.buffer, b.byteOffset, b.byteLength);

  return Buffer.from(u8)
    .toString("base64")
    .replace(/\+/g, DASH)
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const isPem = (s: string): boolean => s.includes("BEGIN PUBLIC KEY");

const f2l = new Fido2Lib({
  timeout: 60000,
  rpId: env.rpId,
  rpName: env.rpName,
  challengeSize: 64,
  attestation: "none",
  authenticatorUserVerification: "preferred",
});

export const webauthnRoutes: FastifyPluginAsync = async (app) => {
  app.post("/webauthn/register/options", async (req, reply) => {
    const { resolutionId: rawId } = req.body as { resolutionId?: string };
    const resolutionId = rawId?.trim();
    if (!resolutionId) {
      return reply.status(400).send({ error: "missing_resolutionId" });
    }

    const db = await getDb();
    const resolution = await getValidQrResolution(db, resolutionId);
    if (!resolution) {
      return reply.status(400).send({ error: "invalid_resolutionId" });
    }

    const existing = await getPasskeyByUserId(db, resolution.userId);
    if (existing) {
      return reply.status(409).send({ error: "passkey_already_exists" });
    }

    const base = await f2l.attestationOptions();

    const options: any = {
      ...base,
      rp: { name: env.rpName, id: env.rpId },
      user: {
        id: bufLikeToB64u(userIdToBytes(resolution.userId)),
        name: resolution.userId,
        displayName: resolution.userId,
      },
      challenge: bufLikeToB64u(base.challenge as any),
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    };

    const ch = await createChallenge(
      db,
      resolution.userId,
      "register",
      options.challenge,
      5,
    );

    return { challengeId: ch.id, options };
  });

  app.post("/webauthn/register/verify", async (req, reply) => {
    const { challengeId: rawChId, response } = req.body as {
      challengeId?: string;
      response?: any;
    };

    const challengeId = rawChId?.trim();
    if (!challengeId || !response) {
      return reply.status(400).send({ error: "bad_request" });
    }

    const db = await getDb();
    const ch = await getValidChallenge(db, challengeId, "register");
    if (!ch) {
      return reply.status(400).send({ error: "invalid_challenge" });
    }

    try {
      if (!response.rawId) return reply.status(400).send({ error: "missing_rawId" });
      if (!response.id) return reply.status(400).send({ error: "missing_id" });

      const attestationResponse: any = {
        id: b64uToArrayBuffer(response.id),
        rawId: b64uToArrayBuffer(response.rawId),
        type: response.type,
        response: {
          clientDataJSON: b64uToArrayBuffer(response.response.clientDataJSON),
          attestationObject: b64uToArrayBuffer(response.response.attestationObject),
        },
        clientExtensionResults: response.clientExtensionResults ?? {},
      };

      const expected: any = {
        challenge: b64uToArrayBuffer(ch.challenge),
        origin: env.origin,
        factor: "either",
      };

      const result: any = await f2l.attestationResult(attestationResponse, expected);
      const authnrData: any = result.authnrData;

      const credId: ArrayBuffer = authnrData.get("credId");
      const publicKeyPem: string = authnrData.get("credentialPublicKeyPem");
      const counter: number = Number(authnrData.get("counter") ?? 0);

      await upsertSinglePasskey(db, {
        userId: ch.userId,
        credentialId: bufLikeToB64u(credId),
        publicKey: publicKeyPem,
        counter,
        createdAt: Date.now(),
      });

      await deleteChallenge(db, ch.id);
      return { ok: true, userId: ch.userId };
    } catch (e: any) {
      app.log.error(e);
      await deleteChallenge(db, ch.id);
      return reply
        .status(500)
        .send({ error: "registration_failed", details: e?.message ?? String(e) });
    }
  });

  app.post("/webauthn/login/options", async (req, reply) => {
    const { userId: rawUserId } = req.body as { userId?: string };
    const userId = rawUserId?.trim();
    if (!userId) {
      return reply.status(400).send({ error: "missing_userId" });
    }

    const db = await getDb();
    const pk = await getPasskeyByUserId(db, userId);
    if (!pk) {
      return reply.status(404).send({ error: "no_passkey" });
    }

    const base = await f2l.assertionOptions();

    const options: any = {
      ...base,
      challenge: bufLikeToB64u(base.challenge as any),
      rpId: env.rpId,
      timeout: 60000,
      userVerification: "preferred",
      allowCredentials: [
        {
          type: "public-key",
          id: pk.credentialId,
        },
      ],
    };

    const ch = await createChallenge(db, userId, "login", options.challenge, 5);
    return { challengeId: ch.id, options };
  });

  app.post("/webauthn/login/verify", async (req, reply) => {
    const { challengeId: rawChId, response } = req.body as {
      challengeId?: string;
      response?: any;
    };

    const challengeId = rawChId?.trim();
    if (!challengeId || !response) {
      return reply.status(400).send({ error: "bad_request" });
    }

    const db = await getDb();
    const ch = await getValidChallenge(db, challengeId, "login");
    if (!ch) {
      return reply.status(400).send({ error: "invalid_challenge" });
    }

    const pk = await getPasskeyByUserId(db, ch.userId);
    if (!pk) {
      await deleteChallenge(db, ch.id);
      return reply.status(404).send({ error: "passkey_not_found_in_db" });
    }

    if (!isPem(pk.publicKey)) {
      await deleteChallenge(db, ch.id);
      return reply.status(409).send({
        error: "passkey_needs_reregistration",
        details: "Stored public key is not in PEM format. Delete passkey and register again.",
      });
    }

    try {
      if (!response.rawId) return reply.status(400).send({ error: "missing_rawId" });
      if (!response.id) return reply.status(400).send({ error: "missing_id" });

      const assertionResponse: any = {
        id: b64uToArrayBuffer(response.id),
        rawId: b64uToArrayBuffer(response.rawId),
        type: response.type,
        response: {
          clientDataJSON: b64uToArrayBuffer(response.response.clientDataJSON),
          authenticatorData: b64uToArrayBuffer(response.response.authenticatorData),
          signature: b64uToArrayBuffer(response.response.signature),
        },
        clientExtensionResults: response.clientExtensionResults ?? {},
      };

      let userHandleAB: ArrayBuffer | undefined;

      if (response.response.userHandle) {
        userHandleAB = b64uToArrayBuffer(response.response.userHandle);
        assertionResponse.response.userHandle = userHandleAB;
      }

      const expected: any = {
        challenge: b64uToArrayBuffer(ch.challenge),
        origin: env.origin,
        factor: "either",
        publicKey: pk.publicKey,
        prevCounter: Number(pk.counter) || 0,
      };

      if (userHandleAB) {
        expected.userHandle = userHandleAB;
      }

      const result: any = await f2l.assertionResult(assertionResponse, expected);
      const authnrData: any = result.authnrData;

      const newCounter: number = Number(authnrData.get("counter") ?? 0);
      await updateCounter(db, ch.userId, newCounter);

      await deleteChallenge(db, ch.id);
      return { ok: true, userId: ch.userId };
    } catch (e: any) {
      app.log.error(e);
      await deleteChallenge(db, ch.id);
      return reply
        .status(500)
        .send({ error: "verification_failed", details: e?.message ?? String(e) });
    }
  });
};
