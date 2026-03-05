import { api } from "./api";

type MeResponse = {
  userId: string;
  email?: string;
};

let inFlight: Promise<MeResponse | null> | null = null;
let cached: MeResponse | null = null;

export const authMeOnce = async (): Promise<MeResponse | null> => {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = api
    .get<MeResponse>("/auth/me")
    .then((res) => {
      cached = res;
      return res;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

export const clearAuthCache = () => {
  cached = null;
};
