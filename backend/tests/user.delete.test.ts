import test from "node:test";
import assert from "node:assert/strict";
import { makeTestDbPath, extractSetCookie, pickCookiePair } from "./helpers.ts";

test("user delete erases user and session shuts down", async () => {
  process.env.NODE_ENV = "test";
  process.env.DB_PATH = makeTestDbPath();
  process.env.ADMIN_KEY = "dev-admin-key";
  process.env.COOKIE_NAME = "sid";
  process.env.AI_MODE = "stub";
  process.env.TTL_ENABLED = "false";

  const { migrate } = await import("../src/db/migrate.ts");
  await migrate();

  const { buildApp } = await import("../src/app.ts");
  const app = buildApp();
  await app.ready();

  // 1. generate invite
  const inviteRes = await app.inject({
    method: "POST",
    url: "/invites",
    headers: { "x-admin-key": "dev-admin-key" },
    payload: {},
  });
  const { code } = inviteRes.json() as any;

  // 2. login via qr to get session
  const qrRes = await app.inject({
    method: "POST",
    url: "/auth/qr",
    payload: { code },
  });
  
  const setCookie = extractSetCookie(qrRes.headers as any);
  const cookiePair = pickCookiePair(setCookie, "sid");
  assert.ok(cookiePair, "session cookie should be present");

  // 3. delete user (self-delete)
  const delRes = await app.inject({
    method: "POST",
    url: "/user/delete",
    headers: { cookie: cookiePair },
    payload: {},
  });

  // must return 200 now that endpoint is implemented
  assert.equal(delRes.statusCode, 200);

  // 4. verify session is no longer valid for auth/me
  const meRes = await app.inject({
    method: "GET",
    url: "/auth/me",
    headers: { cookie: cookiePair },
  });

  assert.equal(meRes.statusCode, 401);

  // 5. verify chat history is also blocked
  const histRes = await app.inject({
    method: "GET",
    url: "/chat/history?conversationId=default",
    headers: { cookie: cookiePair },
  });

  assert.equal(histRes.statusCode, 401);

  await app.close();
});