import test from "node:test";
import assert from "node:assert/strict";
import { makeTestDbPath, loginWithInvite, waitFor } from "./helpers.ts";

test("reply fail writes error_generating_reply and stops replying", async () => {
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

  const cookiePair = await loginWithInvite(app);
  assert.ok(cookiePair);

  const sendRes = await app.inject({
    method: "POST",
    url: "/chat/message",
    headers: { cookie: cookiePair },
    payload: { message: "FAIL_REPLY", conversationId: "default" },
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
    return assistant?.content === "error_generating_reply";
  }, 1200, 50);

  assert.equal(ok, true);

  await app.close();
});