import test from "node:test";
import assert from "node:assert/strict";
import { makeTestDbPath, loginWithInvite } from "./helpers.ts";

test("rate limit returs 429 when limit is exceeded", async () => {
  process.env.NODE_ENV = "test";
  process.env.DB_PATH = makeTestDbPath();
  process.env.ADMIN_KEY = "dev-admin-key";
  process.env.COOKIE_NAME = "sid";
  process.env.AI_MODE = "stub";
  process.env.TTL_ENABLED = "false";
  process.env.RATE_LIMIT_WINDOW_MS = "60000";
  process.env.RATE_LIMIT_MAX = "5";

  const { migrate } = await import("../src/db/migrate.ts");
  await migrate();

  const { buildApp } = await import("../src/app.ts");
  const app = buildApp();
  await app.ready();

  const cookiePair = await loginWithInvite(app);

  let lastStatus = 0;
  for (let i = 0; i < 8; i += 1) {
    const res = await app.inject({
      method: "POST",
      url: "/chat/message",
      headers: { cookie: cookiePair },
      payload: { message: `hei ${i}`, conversationId: "default" },
    });
    lastStatus = res.statusCode;
    if (lastStatus === 429) break;
  }

  assert.equal(lastStatus, 429);

  await app.close();
});