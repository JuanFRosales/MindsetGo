import test from "node:test";
import assert from "node:assert/strict";
import { makeTestDbPath, extractSetCookie, pickCookiePair } from "./helpers.ts";

test("ttl cleanup deletes expired rows", async () => {
  process.env.NODE_ENV = "test";
  process.env.DB_PATH = makeTestDbPath();
  process.env.ADMIN_KEY = "dev-admin-key";
  process.env.COOKIE_NAME = "sid";
  process.env.AI_MODE = "stub";
  process.env.TTL_ENABLED = "true";

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
  const { code } = inviteRes.json() as any;

  const qrRes = await app.inject({
    method: "POST",
    url: "/auth/qr",
    payload: { code },
  });
  assert.equal(qrRes.statusCode, 200);

  const setCookie = extractSetCookie(qrRes.headers as any);
  const cookiePair = pickCookiePair(setCookie, "sid");
  assert.ok(cookiePair);

  const sendRes = await app.inject({
    method: "POST",
    url: "/chat/message",
    headers: { cookie: cookiePair },
    payload: { message: "ttl testi", conversationId: "default" },
  });
  assert.equal(sendRes.statusCode, 200);

  const histRes = await app.inject({
    method: "GET",
    url: "/chat/history?conversationId=default",
    headers: { cookie: cookiePair },
  });
  assert.equal(histRes.statusCode, 200);
  const hist = histRes.json() as any[];

  assert.ok(Array.isArray(hist));
  const lastUserMsg = hist.find((m) => m.role === "user");
  assert.ok(lastUserMsg?.id);

  const { getDb } = await import("../src/db/sqlite.ts");
  const db = await getDb();

  await db.run(
    "UPDATE messages SET expiresAt = ? WHERE id = ?",
    Date.now() - 1000,
    lastUserMsg.id
  );

  const { runTtlCleanup } = await import("../src/jobs/ttlCleanup.ts");
  const result = await runTtlCleanup(app);

  assert.ok((result.deletedMessages ?? 0) >= 1);

  const left = await db.get("SELECT id FROM messages WHERE id = ?", lastUserMsg.id);
  assert.equal(left, undefined);

  await app.close();
});