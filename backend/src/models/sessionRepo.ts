import type { Database } from "sqlite";
import { uuidv7 } from "../utils/uuidv7.ts";
import type { EntityId, Timestamps, Expirable } from "../types/projectTypes.ts";

// Helper functions for time calculations
const nowMs = (): number => Date.now();
const minutesFromNow = (minutes: number): number =>
  nowMs() + minutes * 60 * 1000;

// Session type definition 
export type Session = {
  id: EntityId;
  userId: EntityId;
} & Timestamps &
  Expirable;

// Create a new session for a user with specified TTL in minutes
export const createSession = async (
  db: Database,
  userId: EntityId,
  ttlMinutes: number
): Promise<Session> => {
  const createdAt = nowMs();

// Insert the new session into the database
  const session: Session = {
    id: uuidv7(createdAt),
    userId,
    createdAt,
    expiresAt: minutesFromNow(ttlMinutes)
  };

  await db.run(
    `INSERT INTO sessions
     (id, userId, createdAt, expiresAt)
     VALUES (?, ?, ?, ?)`,
    session.id,
    session.userId,
    session.createdAt,
    session.expiresAt
  );

  return session;
};
// Retrieve a valid (non-expired) session by ID
export const getValidSession = async (
  db: Database,
  id: EntityId
): Promise<Session | null> => {
  const row = await db.get<Session>(
    `SELECT id, userId, createdAt, expiresAt
     FROM sessions
     WHERE id = ?`,
    id
  );

  if (!row) return null;
  if (row.expiresAt <= nowMs()) return null;

  return row;
};

// Delete a session by ID
export const deleteSession = async (
  db: Database,
  id: EntityId
): Promise<void> => {
  await db.run(
    "DELETE FROM sessions WHERE id = ?",
    id
  );
};
