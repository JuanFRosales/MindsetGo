import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "./sqlite.ts";

type MigrationRow = { version: string };

// Setup paths for ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.resolve(__dirname, "../../migrations");

// Create migration tracking table if it doesn't exist
const ensureMigrationsTable = async () => {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      appliedAt INTEGER NOT NULL
    );
  `);
};

// Retrieve and sort all .sql files from migrations directory
const listSqlFiles = async (): Promise<string[]> => {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => e.name)
    .sort();
};

// Fetch versions already applied to the database
const getAppliedVersions = async (): Promise<Set<string>> => {
  const db = await getDb();
  const rows = (await db.all(
    "SELECT version FROM schema_migrations ORDER BY version ASC",
  )) as MigrationRow[];
  return new Set(rows.map((r) => r.version));
};

// Execute a single migration file within a transaction
const applyOne = async (filename: string) => {
  const db = await getDb();
  const full = path.join(migrationsDir, filename);
  const sql = await fs.readFile(full, "utf8");
  const now = Date.now();

  // Ensure foreign key constraints are enforced
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
    // Revert changes if the migration fails
    await db.exec("ROLLBACK;");
    throw e;
  }
};

// Orchestrate the migration process by applying pending files
export const migrate = async (): Promise<{ applied: string[] }> => {
  await ensureMigrationsTable();

  const files = await listSqlFiles();
  const applied = await getAppliedVersions();

  // Filter and execute migrations that have not been run yet
  const toApply = files.filter((f) => !applied.has(f));
  for (const f of toApply) {
    await applyOne(f);
  }

  return { applied: toApply };
};