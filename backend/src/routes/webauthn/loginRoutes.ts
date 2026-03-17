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
  updateCounter,
} from "../../models/passkeyRepo.ts";
import { createLoginProof } from "../../models/loginProofRepo.ts";
import {
  b64uToArrayBuffer,
  bufLikeToB64u,
  isPem,
} from "./webauthnHelpers.ts";
import {
  loginOptionsBodySchema,
  loginVerifyBodySchema,
} from "./webauthnSchemas.ts";
import { f2l } from "./config.ts";

/**
 * Maps complex Fido2Lib error messages to stable, machine-readable error codes.
 */
const classifyVerificationError = (err: unknown): string => {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  if (msg.includes("origin")) return "origin_mismatch";
  if (msg.includes("challenge")) return "challenge_mismatch";
  if (msg.includes("credential")) return "credential_mismatch";
  if (msg.includes("counter")) return "counter_mismatch";
  if (msg.includes("signature")) return "signature_invalid";
  if (msg.includes("authenticator")) return "authenticator_data_invalid";

  return "verification_failed";
};

// Register routes for WebAuthn (Passkey) login flow
export const loginRoutes = async (app: FastifyInstance): Promise<void> => {
  
  // Generate WebAuthn assertion options and store a challenge for the user
  app.post(
    "/webauthn/login/options",
    {
      schema: {
        body: loginOptionsBodySchema,
      },
    },
    async (req, reply) => {
      const { userId: rawUserId } = req.body as { userId: string };
      const userId = rawUserId.trim();

      const db = await getDb();
      // Ensure user has a registered passkey before proceeding
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

      // Store the challenge in DB with a 5-minute expiry
      const ch = await createChallenge(db, userId, "login", options.challenge, 5);
      return { challengeId: ch.id, publicKey: options };
    },
  );

  // Verify the WebAuthn assertion and issue a login proof
  app.post(
    "/webauthn/login/verify",
    {
      schema: {
        body: loginVerifyBodySchema,
      },
    },
    async (req, reply) => {
      const {
        challengeId: rawChId,
        resolutionId: rawResId,
        response,
      } = req.body as {
        challengeId: string;
        resolutionId: string;
        response: any;
      };

      const challengeId = rawChId.trim();
      const resolutionId = rawResId.trim();

      const db = await getDb();
      // Validate that the login challenge exists and is still active
      const ch = await getValidChallenge(db, challengeId, "login");
      if (!ch) {
        return reply.status(400).send({ error: "invalid_challenge" });
      }

      try {
        // Validate the associated QR resolution (cross-device linking)
        const resolution = await getValidQrResolution(db, resolutionId);
        if (!resolution) {
          await deleteChallenge(db, ch.id);
          return reply.status(400).send({ error: "invalid_resolutionId" });
        }

        // Security check: ensure the challenge user matches the resolution user
        if (resolution.userId !== ch.userId) {
          await deleteChallenge(db, ch.id);
          return reply.status(400).send({ error: "resolution_user_mismatch" });
        }

        const pk = await getPasskeyByUserId(db, ch.userId);
        if (!pk) {
          await deleteChallenge(db, ch.id);
          return reply.status(404).send({ error: "passkey_not_found_in_db" });
        }

        // Verify that the stored public key is in a valid PEM format
        if (!isPem(pk.publicKey)) {
          await deleteChallenge(db, ch.id);
          return reply.status(409).send({ error: "passkey_needs_reregistration" });
        }

        // Reconstruct the assertion response from the client's Base64URL data
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

        if (response.response.userHandle) {
          assertionResponse.response.userHandle = b64uToArrayBuffer(response.response.userHandle);
        }

        const expected: any = {
          challenge: b64uToArrayBuffer(ch.challenge),
          origin: env.origin,
          factor: "either",
          publicKey: pk.publicKey,
          prevCounter: Number(pk.counter) || 0,
        };

        if (assertionResponse.response.userHandle) {
          expected.userHandle = assertionResponse.response.userHandle;
        }

        // Use Fido2Lib to cryptographically verify the signature
        const result: any = await f2l.assertionResult(assertionResponse, expected);
        const newCounter: number = Number(result.authnrData.get("counter") ?? 0);

        // Update authenticator counter to prevent replay attacks
        await updateCounter(db, ch.userId, newCounter);
        
        // Generate a proofId that the client can exchange for a session cookie
        const proof = await createLoginProof(db, ch.userId, resolutionId, 5);
        await deleteChallenge(db, ch.id);

        return { ok: true, userId: ch.userId, proofId: proof.id };
      } catch (e: any) {
        const errorCode = classifyVerificationError(e);

        // Detailed server-side logging for troubleshooting
        app.log.error(
          {
            err: e,
            msg: e?.message ?? String(e),
            stack: e?.stack,
            expectedOrigin: env.origin,
            expectedRpId: env.rpId,
            challengeId: ch.id,
            resolutionId,
            userId: ch.userId,
            errorCode,
          },
          "webauthn_login_verify_failed",
        );

        await deleteChallenge(db, ch.id);
  
        return reply.status(500).send({ error: "verification_failed" });
      }
    },
  );
};