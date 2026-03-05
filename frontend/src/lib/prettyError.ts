import type { ApiError } from "./api";

export const prettyApiError = (e: ApiError): string => {
  if (e.error === "unauthorized") return "Kirjaudu sisään.";
  if (e.error === "rate_limited") return "Liikaa pyyntöjä. Yritä hetken päästä.";
  if (e.error === "network_error") return "Yhteys ei toimi juuri nyt.";
  return "Jokin meni pieleen.";
};
