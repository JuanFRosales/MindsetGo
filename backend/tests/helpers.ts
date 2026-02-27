import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Helper functions for tests
export const makeTestDbPath = () => {
  const dir = join(tmpdir(), "backend-tests");
  mkdirSync(dir, { recursive: true });
  return join(dir, `test-${Date.now()}-${randomUUID()}.db`);
};
// Extracts the Set-Cookie header value from the response headers
export const extractSetCookie = (headers: Record<string, any>) => {
  const sc = headers["set-cookie"];
  if (!sc) return "";
  if (Array.isArray(sc)) return sc.join("; ");
  return String(sc);
};
// Picks the cookie pair (name=value) for the specified cookie name from the Set-Cookie header
export const pickCookiePair = (setCookieHeader: string, cookieName: string) => {
  const parts = setCookieHeader.split(",");
  for (const p of parts) {
    const seg = p.trim();
    if (seg.startsWith(`${cookieName}=`)) return seg.split(";")[0];
  }
  return "";
};
// Helper function to perform the invite + QR code login flow and return the session cookie pair
export const loginWithInvite = async (app: any) => {
  const inviteRes = await app.inject({
    method: "POST",
    url: "/invites",
    headers: { "x-admin-key": "dev-admin-key" },
    payload: {},
  });

  const { code } = inviteRes.json() as any;
// Perform QR code login to get session cookie
  const qrRes = await app.inject({
    method: "POST",
    url: "/auth/qr",
    payload: { code },
  });

  const setCookie = extractSetCookie(qrRes.headers as any);
  const cookiePair = pickCookiePair(setCookie, "sid");
  return cookiePair;
};
// Simple sleep function to pause execution for a specified number of milliseconds
export const sleep = async (ms: number) => new Promise((r) => setTimeout(r, ms));
// Waits for the provided async function to return true, checking every msStep milliseconds, up to a total of msTotal milliseconds
export const waitFor = async (fn: () => Promise<boolean>, msTotal: number, msStep: number) => {
  const deadline = Date.now() + msTotal;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    await sleep(msStep);
  }
  return false;
};