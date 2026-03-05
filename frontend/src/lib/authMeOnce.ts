import { api } from "./api";

type MeResponse = {
  userId: string;
  email?: string;
};

let inFlight: Promise<MeResponse | null> | null = null;
let cached: MeResponse | null = null;
/* 
  authMeOnce is a function that fetches the current user's authentication status from the server.
  caching used to avoid redundant network requests
  If the request fails, it returns null and clears the cache. 
*/
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
