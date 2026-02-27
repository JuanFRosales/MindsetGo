import test from "node:test";
import assert from "node:assert/strict";
import { makeTestDbPath, loginWithInvite, waitFor } from "./helpers.ts";

test("profile state scrubs pii strings from within jsonin", async () => {
  process.env.NODE_ENV = "test";
  process.env.DB_PATH = makeTestDbPath();
  process.env.ADMIN_KEY = "dev-admin-key";
  process.env.COOKIE_NAME = "sid";
  process.env.AI_MODE = "stub";
  process.env.TTL_ENABLED = "false";
  process.env.TEST_PROFILE_PII = "true";

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

  const ok = await waitFor(async () => {
    const db = await getDb();
    const meRes = await app.inject({ method: "GET", url: "/auth/me", headers: { cookie: cookiePair } });
    const me = meRes.json() as any;
    const row = await getProfileState(db, me.user.id);
    if (!row) return false;
    const s = row.stateJson;
    return s.includes("[EMAIL]") && s.includes("[PHONE]");
  }, 1500, 50);

  assert.equal(ok, true);

  const db2 = await getDb();
  const meRes2 = await app.inject({ method: "GET", url: "/auth/me", headers: { cookie: cookiePair } });
  const me2 = meRes2.json() as any;
  const row2 = await getProfileState(db2, me2.user.id);
  assert.ok(row2);

  assert.ok(row2.stateJson.includes("[EMAIL]"));
  assert.ok(row2.stateJson.includes("[PHONE]"));
  assert.ok(!row2.stateJson.includes("test@example.com"));
  assert.ok(!row2.stateJson.includes("0401234567"));

  await app.close();
});