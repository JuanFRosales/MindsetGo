import test from "node:test";
import assert from "node:assert/strict";
import { makeTestDbPath, extractSetCookie, pickCookiePair } from "./helpers.ts";

test("chat requires session and scrubs content", async () => {
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

  const unauthorized = await app.inject({
    method: "POST",
    url: "/chat/message",
    payload: { message: "hei", conversationId: "default" },
  });
  assert.equal(unauthorized.statusCode, 401);

  const inviteRes = await app.inject({
    method: "POST",
    url: "/invites",
    headers: { "x-admin-key": "dev-admin-key" },
    payload: {},
  });
  const { code } = inviteRes.json() as any;

  const qrRes = await app.inject({
    method: "POST",
    url: "/auth/qr",
    payload: { code },
  });

  const setCookie = extractSetCookie(qrRes.headers as any);
  const cookiePair = pickCookiePair(setCookie, "sid");
  assert.ok(cookiePair);

  const msg = "Testi viesti jossa on email test@example.com ja puh 0401234567";
  const sendRes = await app.inject({
    method: "POST",
    url: "/chat/message",
    headers: { cookie: cookiePair },
    payload: { message: msg, conversationId: "default" },
  });

  assert.equal(sendRes.statusCode, 200);

  const histRes = await app.inject({
    method: "GET",
    url: "/chat/history?conversationId=default",
    headers: { cookie: cookiePair },
  });

  assert.equal(histRes.statusCode, 200);
  const hist = histRes.json() as any[];

  const joined = JSON.stringify(hist);
  assert.ok(joined.includes("[EMAIL]"));
  assert.ok(joined.includes("[PHONE]"));
  assert.ok(!joined.includes("test@example.com"));
  assert.ok(!joined.includes("0401234567"));

  await app.close();
});