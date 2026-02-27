import test from "node:test";
import assert from "node:assert/strict";
import { makeTestDbPath, loginWithInvite } from "./helpers.ts";

test("chat rejects oversized payload", async () => {
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

  const big = "a".repeat(120_000);

  const res = await app.inject({
    method: "POST",
    url: "/chat/message",
    headers: { cookie: cookiePair, "content-type": "application/json" },
    payload: { message: big, conversationId: "default" },
  });

  assert.ok([400, 413].includes(res.statusCode));

  await app.close();
});