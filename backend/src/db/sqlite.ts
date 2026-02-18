import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "node:path";
import { env } from "../config/env.js";

// Cached promise to handle concurrent calls
let dbPromise: Promise<Database> | null = null;

export const getDb = async (): Promise<Database> => {
  // If connection is already being opened or is open, return the promise
  if (dbPromise) return dbPromise;

  // Define database file path
  const dbFile = (env as any).sqlitePath ?? path.resolve(process.cwd(), env.dbPath);

  // Initialize the opening process
  dbPromise = (async () => {
    const db = await open({
      filename: dbFile,
      driver: sqlite3.Database,
    });

    // Performance and integrity settings
    await db.exec("PRAGMA foreign_keys = ON;");
    await db.exec("PRAGMA journal_mode = WAL;");
    await db.exec("PRAGMA busy_timeout = 5000;");

    return db;
  })();

  return dbPromise;
};