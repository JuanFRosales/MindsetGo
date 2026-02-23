import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "./sqlite.js";

type MigrationRow = { version: string };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.resolve(__dirname, "../../migrations");

const ensureMigrationsTable = async () => {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      appliedAt INTEGER NOT NULL
    );
  `);
};

const listSqlFiles = async (): Promise<string[]> => {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => e.name)
    .sort();
};

const getAppliedVersions = async (): Promise<Set<string>> => {
  const db = await getDb();
  const rows = (await db.all(
    "SELECT version FROM schema_migrations ORDER BY version ASC",
  )) as MigrationRow[];
  return new Set(rows.map((r) => r.version));
};

const applyOne = async (filename: string) => {
  const db = await getDb();
  const full = path.join(migrationsDir, filename);
  const sql = await fs.readFile(full, "utf8");
  const now = Date.now();

  await db.exec("PRAGMA foreign_keys = ON;");

  await db.exec("BEGIN;");
  try {
    await db.exec(sql);
    await db.run(
      "INSERT INTO schema_migrations(version, appliedAt) VALUES(?, ?)",
      filename,
      now,
    );
    await db.exec("COMMIT;");
  } catch (e) {
    await db.exec("ROLLBACK;");
    throw e;
  }
};

export const migrate = async (): Promise<{ applied: string[] }> => {
  await ensureMigrationsTable();

  const files = await listSqlFiles();
  const applied = await getAppliedVersions();

  const toApply = files.filter((f) => !applied.has(f));
  for (const f of toApply) {
    await applyOne(f);
  }

  return { applied: toApply };
};