import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../config/env.js";
import { getDb } from "./sqlite.js";

// Ensure the database directory exists
async function ensureDbDir() {
  const dir = dirname(env.dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// Apply the base schema from schema.sql
async function applyBaseSchema() {
  const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
  const db = await getDb();
  await db.exec(sql);
}

// Main migration function
async function main() {
  await ensureDbDir();
  await applyBaseSchema();
  console.log("Migrations ok");
}


main().catch((err) => {
  console.error(err);
  process.exit(1);
});
