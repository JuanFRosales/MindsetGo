import test from "node:test";
import assert from "node:assert/strict";
import { makeTestDbPath } from "./helpers.ts";


// test to verify that /auth/qr endpoint rejects invalid invite codes and does not set a session cookie
test("auth qr rejects invalid codes and does not set session cookie", async () => {
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

  const res = await app.inject({
    method: "POST",
    url: "/auth/qr",
    payload: { code: "not-a-real-code" },
  });

  assert.ok([400, 401].includes(res.statusCode));
  const sc = (res.headers as any)["set-cookie"];
  assert.equal(sc, undefined);

  await app.close();
});