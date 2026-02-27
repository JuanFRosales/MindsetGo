import test from "node:test";
import assert from "node:assert/strict";
import { makeTestDbPath, loginWithInvite, waitFor } from "./helpers.ts";

test("ttl cleanup deletes summary and profilestate lines", async () => {
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

  const cookiePair = await loginWithInvite(app);

  const sendRes = await app.inject({
    method: "POST",
    url: "/chat/message",
    headers: { cookie: cookiePair },
    payload: { message: "hei", conversationId: "default" },
  });
  assert.equal(sendRes.statusCode, 200);

  const { getDb } = await import("../src/db/sqlite.ts");
  const { getProfileState } = await import("../src/models/profileStateRepo.ts");
  const { getConversationSummary } = await import("../src/models/conversationSummaryRepo.ts");

  const meRes = await app.inject({ method: "GET", url: "/auth/me", headers: { cookie: cookiePair } });
  const me = meRes.json() as any;
  const userId = me.user.id;

  const ok = await waitFor(async () => {
    const db = await getDb();
    const p = await getProfileState(db, userId);
    const s = await getConversationSummary(db, userId, "default");
    return Boolean(p && s);
  }, 1500, 50);

  assert.equal(ok, true);

  const db2 = await getDb();
  const p2 = await getProfileState(db2, userId);
  const s2 = await getConversationSummary(db2, userId, "default");
  assert.ok(p2);
  assert.ok(s2);

  await db2.run("UPDATE profile_state SET expiresAt = ? WHERE userId = ?", Date.now() - 1000, userId);
  await db2.run(
    "UPDATE conversation_summary SET expiresAt = ? WHERE userId = ? AND conversationId = ?",
    Date.now() - 1000,
    userId,
    "default"
  );

  const { runTtlCleanup } = await import("../src/jobs/ttlCleanup.ts");
  const result = await runTtlCleanup(app);

  assert.ok((result.deletedProfileStates ?? 0) >= 1);
  assert.ok((result.deletedConversationSummaries ?? 0) >= 1);

  const db3 = await getDb();
  const p3 = await getProfileState(db3, userId);
  const s3 = await getConversationSummary(db3, userId, "default");
  assert.equal(p3, null);
  assert.equal(s3, null);

  await app.close();
});