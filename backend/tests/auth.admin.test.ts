import test from "node:test";
import assert from "node:assert/strict";
import { makeTestDbPath } from "./helpers.ts";

// test to verify that /invites endpoint requires the correct admin key and does not allow unauthorized access
test("invites vaatii admin keyn", async () => {
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

  const res1 = await app.inject({ method: "POST", url: "/invites", payload: {} });
  assert.ok([401, 403].includes(res1.statusCode));

  const res2 = await app.inject({
    method: "POST",
    url: "/invites",
    headers: { "x-admin-key": "wrong" },
    payload: {},
  });
  assert.ok([401, 403].includes(res2.statusCode));

  await app.close();
});