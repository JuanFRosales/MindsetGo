import crypto from "node:crypto";
import { getDb } from "../db/sqlite.ts";
import type { AdminSessionRow, AdminSessionDbRow } from "../types/projectTypes.ts";

// Set admin session duration to 8 hours
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 8;

// Create a new unique admin session in the database
export const createAdminSession = async (): Promise<string> => {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const expires = now + ADMIN_SESSION_TTL_MS;

  await db.run(
    `
    INSERT INTO admin_sessions (id, created_at, expires_at)
    VALUES (?, ?, ?)
    `,
    id,
    now,
    expires,
  );

  return id;
};

// Retrieve an admin session by its unique ID
export const getAdminSession = async (
  id: string,
): Promise<AdminSessionRow | null> => {
  const db = await getDb();

  const row = await db.get<AdminSessionDbRow>(
    `
    SELECT id, created_at, expires_at
    FROM admin_sessions
    WHERE id = ?
    `,
    id,
  );

  if (!row) return null;

  return {
    id: row.id,
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  };
};

// Manually revoke an admin session by ID
export const deleteAdminSession = async (id: string): Promise<void> => {
  const db = await getDb();

  await db.run(
    `
    DELETE FROM admin_sessions
    WHERE id = ?
    `,
    id,
  );
};

// Periodically remove all expired sessions from the database
export const cleanupExpiredAdminSessions = async (): Promise<void> => {
  const db = await getDb();
  const now = Date.now();

  await db.run(
    `
    DELETE FROM admin_sessions
    WHERE expires_at <= ?
    `,
    now,
  );
};