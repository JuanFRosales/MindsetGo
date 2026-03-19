import type { ApiError } from "./api";
import { prettyApiError } from "./prettyError";

export const prettyPasskeyError = (e: ApiError): string => {
  if (e.error === "invalid_resolutionId") return "Istunto on vanhentunut. Palaa alkuun.";
  if (e.error === "invalid_challenge") return "Vahvistus vanhentui. Yritä uudelleen.";
  if (e.error === "no_passkey") return "Passkey puuttuu tältä käyttäjältä.";
  if (e.error === "passkey_already_exists") return "Passkey on jo luotu.";
  if (e.error === "passkey_needs_reregistration") return "Passkey pitää luoda uudelleen.";
  if (e.error === "verification_failed") return "Vahvistus epäonnistui.";
  if (e.error === "registration_failed") return "Passkeyn luonti epäonnistui.";
  if (e.error === "invalid_or_expired_proof") return "Kirjautumisen vahvistus vanhentui.";
  if (e.error === "proof_already_used") return "Kirjautumisen vahvistus on jo käytetty.";
  return prettyApiError(e);
};