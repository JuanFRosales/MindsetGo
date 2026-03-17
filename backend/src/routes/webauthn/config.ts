import { Fido2Lib } from "fido2-lib";
import { env } from "../../config/env.ts";

// WebAuthn configuration and Fido2Lib instance
export const f2l = new Fido2Lib({
  timeout: 60000,
  rpId: env.rpId,
  rpName: env.rpName,
  challengeSize: 64,
  attestation: "none",
  authenticatorUserVerification: "preferred",
});