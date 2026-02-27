import test from "node:test";
import assert from "node:assert/strict";
import { makeTestDbPath, loginWithInvite, waitFor } from "./helpers.ts";

test("profile fail does not break reply", async () => {
  process.env.NODE_ENV = "test";
  process.env.DB_PATH = makeTestDbPath();
  process.env.ADMIN_KEY = "dev-admin-key";
  process.env.COOKIE_NAME = "sid";
  process.env.AI_MODE = "stub";
  process.env.TTL_ENABLED = "false";
  process.env.TEST_PROFILE_FAIL = "true";

  const { migrate } = await import("../src/db/migrate.ts");
  await migrate();

  const { buildApp } = await import("../src/app.ts");
  const app = buildApp();
  await app.ready();

  const cookiePair = await loginWithInvite(app);

  const sendRes = await app.inject({
    method: "POST",
    url: "/chat/message",
    headers: { cookie: cookiePair },
    payload: { message: "hei", conversationId: "default" },
  });
  assert.equal(sendRes.statusCode, 200);

  const ok = await waitFor(async () => {
    const histRes = await app.inject({
      method: "GET",
      url: "/chat/history?conversationId=default",
      headers: { cookie: cookiePair },
    });
    const hist = histRes.json() as any[];
    const assistant = [...hist].reverse().find((m) => m.role === "assistant");
    return typeof assistant?.content === "string" && assistant.content !== "processing";
  }, 1200, 50);

  assert.equal(ok, true);

  const histRes2 = await app.inject({
    method: "GET",
    url: "/chat/history?conversationId=default",
    headers: { cookie: cookiePair },
  });

  const joined = JSON.stringify(histRes2.json());
  assert.ok(!joined.includes("error_generating_reply"));

  await app.close();
});