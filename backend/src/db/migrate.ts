import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../config/env.js";
import { getDb } from "./sqlite.js";

// Ensure the database directory exists
const ensureDbDir = async (): Promise<void> => {
  const dir = dirname(env.dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

// Apply the base schema from schema.sql
const applyBaseSchema = async (): Promise<void> => {
  const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
  const db = await getDb();
  await db.exec(sql);
};

// Main migration function
const main = async (): Promise<void> => {
  await ensureDbDir();
  await applyBaseSchema();
  console.log("Migrations ok");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});