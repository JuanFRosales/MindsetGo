import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.ts";
import { getDb } from "../../db/sqlite.ts";
import { getValidQrResolution } from "../../models/qrResolutionRepo.ts";
import {
  createChallenge,
  getValidChallenge,
  deleteChallenge,
} from "../../models/webauthnChallengeRepo.ts";
import {
  getPasskeyByUserId,
  upsertSinglePasskey,
} from "../../models/passkeyRepo.ts";
import {
  b64uToArrayBuffer,
  bufLikeToB64u,
  userIdToBytes,
} from "./webauthnHelpers.ts";
import {
  registerOptionsBodySchema,
  registerVerifyBodySchema,
} from "./webauthnSchemas.ts";
import { f2l } from "./config.ts";

// Register routes for WebAuthn (Passkey) creation flow
export const registerRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // Generate attestation options to prepare the client for creating a new passkey
  app.post(
    "/webauthn/register/options",
    {
      schema: {
        body: registerOptionsBodySchema,
      },
    },
    async (req, reply) => {
      const { resolutionId: rawId } = req.body as { resolutionId: string };
      const resolutionId = rawId.trim();

      const db = await getDb();
      // Validate that the request comes from a verified QR scan session
      const resolution = await getValidQrResolution(db, resolutionId);
      if (!resolution) {
        return reply.status(400).send({ error: "invalid_resolutionId" });
      }

      // Prevent multiple passkey registrations for the same user
      const existing = await getPasskeyByUserId(db, resolution.userId);
      if (existing) {
        return reply.status(409).send({ error: "passkey_already_exists" });
      }

      const base = await f2l.attestationOptions();

      // Construct options object including RP (Relying Party) info and user metadata
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

      // Store the registration challenge in DB to verify it in the next step
      const ch = await createChallenge(
        db,
        resolution.userId,
        "register",
        options.challenge,
        5,
      );

      return { challengeId: ch.id, publicKey: options };
    },
  );

  // Verify the client's attestation response and save the new public key
  app.post(
    "/webauthn/register/verify",
    {
      schema: {
        body: registerVerifyBodySchema,
      },
    },
    async (req, reply) => {
      const { challengeId: rawChId, response } = req.body as {
        challengeId: string;
        response: any;
      };

      const challengeId = rawChId.trim();
      const db = await getDb();
      // Check if the registration challenge is valid and hasn't expired
      const ch = await getValidChallenge(db, challengeId, "register");

      if (!ch) {
        return reply.status(400).send({ error: "invalid_challenge" });
      }

      try {
        if (!response.rawId) return reply.status(400).send({ error: "missing_rawId" });
        if (!response.id) return reply.status(400).send({ error: "missing_id" });

        // Map client response fields to ArrayBuffers for Fido2Lib processing
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

        // Perform cryptographic verification of the attestation data
        const result: any = await f2l.attestationResult(attestationResponse, expected);
        const authnrData: any = result.authnrData;

        // Extract the generated Credential ID and Public Key (PEM)
        const credId: ArrayBuffer = authnrData.get("credId");
        const publicKeyPem: string = authnrData.get("credentialPublicKeyPem");
        const counter: number = Number(authnrData.get("counter") ?? 0);

        // Persist the passkey to the database
        await upsertSinglePasskey(db, {
          userId: ch.userId,
          credentialId: bufLikeToB64u(credId),
          publicKey: publicKeyPem,
          counter,
          createdAt: Date.now(),
        });

        // Cleanup the challenge and complete registration
        await deleteChallenge(db, ch.id);
        return { ok: true, userId: ch.userId };
      } catch (e: any) {
        app.log.error({ msg: e?.message ?? String(e) }, "webauthn_register_verify_failed");
        await deleteChallenge(db, ch.id);
        return reply.status(500).send({ error: "registration_failed" });
      }
    },
  );
};