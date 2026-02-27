import test from "node:test";
import assert from "node:assert/strict";
import { makeTestDbPath, extractSetCookie, pickCookiePair } from "./helpers.ts";

// This test covers the following flow:
// 1. Create an invite code using the admin endpoint
// 2. Use the invite code to authenticate via QR code endpoint, which should create a session cookie
// 3. Use the session cookie to call /auth/me and verify that it returns the authenticated user's info

test("invite and qr login works and returns authenticated user info", async () => {
  process.env.NODE_ENV = "test";
  process.env.DB_PATH = makeTestDbPath();
  process.env.ADMIN_KEY = "dev-admin-key";
  process.env.COOKIE_NAME = "sid";
  process.env.TTL_ENABLED = "false";

  const { migrate } = await import("../src/db/migrate.ts");
  await migrate();

  const { buildApp } = await import("../src/app.ts");
  const app = buildApp();
  await app.ready();

  const inviteRes = await app.inject({
    method: "POST",
    url: "/invites",
    headers: { "x-admin-key": "dev-admin-key" },
    payload: {},
  });

  assert.equal(inviteRes.statusCode, 200);
  const invite = inviteRes.json() as { code: string };
  assert.ok(invite.code);

  const qrRes = await app.inject({
    method: "POST",
    url: "/auth/qr",
    payload: { code: invite.code },
  });

  assert.equal(qrRes.statusCode, 200);

  const setCookie = extractSetCookie(qrRes.headers as any);
  const cookiePair = pickCookiePair(setCookie, "sid");
  assert.ok(cookiePair);

  const meRes = await app.inject({
    method: "GET",
    url: "/auth/me",
    headers: { cookie: cookiePair },
  });

  assert.equal(meRes.statusCode, 200);
  const me = meRes.json() as any;
  assert.ok(me.user?.id);

  await app.close();
});