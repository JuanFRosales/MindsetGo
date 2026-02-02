import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";
import { env } from "../config/env.js";

// One shared database instance
let db: Database | null = null;

export async function getDb(): Promise<Database> {
// Return existing instance if already opened
  if (db) return db;

// Open the database connection
  db = await open({
    filename: env.dbPath,
    driver: sqlite3.Database
  });

// Integrity and performance pragmas
  await db.exec("PRAGMA journal_mode = WAL;");
  await db.exec("PRAGMA foreign_keys = ON;");
  return db;
}
