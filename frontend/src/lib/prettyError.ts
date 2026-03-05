import type { ApiError } from "./api";

// prettyApiError converts an ApiError into a user-friendly error message in Finnish
export const prettyApiError = (e: ApiError): string => {
  if (e.error === "unauthorized") return "Kirjaudu sisään.";
  if (e.error === "rate_limited") return "Liikaa pyyntöjä. Yritä hetken päästä.";
  if (e.error === "network_error") return "Yhteys ei toimi juuri nyt.";
  return "Jokin meni pieleen.";
};
