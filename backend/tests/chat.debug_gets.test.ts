import test from "node:test";
import assert from "node:assert/strict";
import { makeTestDbPath, loginWithInvite, waitFor } from "./helpers.ts";

test("debug GET endpoints require session and return scrubbed data", async () => {
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

  const noAuth1 = await app.inject({ method: "GET", url: "/chat/history?conversationId=default" });
  assert.equal(noAuth1.statusCode, 401);

  const noAuth2 = await app.inject({ method: "GET", url: "/chat/summary?conversationId=default" });
  assert.equal(noAuth2.statusCode, 401);

  const noAuth3 = await app.inject({ method: "GET", url: "/profile" });
  assert.equal(noAuth3.statusCode, 401);

  const noAuth4 = await app.inject({ method: "GET", url: "/chat/message/does_not_matter" });
  assert.equal(noAuth4.statusCode, 401);

  const cookiePair1 = await loginWithInvite(app);
  assert.ok(cookiePair1);

  const sendRes = await app.inject({
    method: "POST",
    url: "/chat/message",
    headers: { cookie: cookiePair1 },
    payload: { message: "email test@example.com", conversationId: "default" },
  });
  assert.equal(sendRes.statusCode, 200);

  const histRes = await app.inject({
    method: "GET",
    url: "/chat/history?conversationId=default",
    headers: { cookie: cookiePair1 },
  });
  assert.equal(histRes.statusCode, 200);
  const hist = histRes.json() as any[];
  assert.ok(Array.isArray(hist));
  assert.ok(hist.length >= 2);

  const anyUser = hist.find((m) => m.role === "user");
  assert.ok(anyUser?.id);

  const msgRes = await app.inject({
    method: "GET",
    url: `/chat/message/${anyUser.id}`,
    headers: { cookie: cookiePair1 },
  });
  assert.equal(msgRes.statusCode, 200);
  const msg = msgRes.json() as any;
  assert.equal(msg.id, anyUser.id);
  assert.ok(String(msg.content).includes("[EMAIL]"));
  assert.ok(!String(msg.content).includes("test@example.com"));

  const gotSummary = await waitFor(async () => {
    const r = await app.inject({
      method: "GET",
      url: "/chat/summary?conversationId=default",
      headers: { cookie: cookiePair1 },
    });
    if (r.statusCode !== 200) return false;
    const j = r.json() as any;
    return typeof j.summary === "string";
  }, 2000, 50);
  assert.ok(gotSummary);

  const profRes = await app.inject({
    method: "GET",
    url: "/profile",
    headers: { cookie: cookiePair1 },
  });
  assert.equal(profRes.statusCode, 200);
  const prof = profRes.json() as any;
  assert.ok(prof && typeof prof === "object");

  const cookiePair2 = await loginWithInvite(app);
  const otherUserMsg = await app.inject({
    method: "GET",
    url: `/chat/message/${anyUser.id}`,
    headers: { cookie: cookiePair2 },
  });
  assert.equal(otherUserMsg.statusCode, 404);

  await app.close();
});
