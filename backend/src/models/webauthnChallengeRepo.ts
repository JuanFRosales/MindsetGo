import type { Database } from "sqlite";
import type { EntityId, Timestamps, Expirable } from "../types/projectTypes.ts";
import { uuidv7 } from "../utils/uuidv7.ts";

const nowMs = (): number => Date.now();
const minutesFromNow = (m: number): number => nowMs() + m * 60 * 1000;

export type WebauthnChallenge = {
  id: EntityId;
  userId: EntityId;
  kind: "register" | "login";
  challenge: string;
} & Timestamps &
  Expirable;

// Create a new WebAuthn challenge for a user 
export const createChallenge = async (
  db: Database,
  userId: EntityId,
  kind: "register" | "login",
  challenge: string,
  ttlMinutes: number = 5
): Promise<WebauthnChallenge> => {
  const createdAt = nowMs();
  const row: WebauthnChallenge = {
    id: uuidv7(createdAt),
    userId,
    kind,
    challenge,
    createdAt,
    expiresAt: minutesFromNow(ttlMinutes)
  };

  await db.run(
    "INSERT INTO webauthn_challenges (id, userId, kind, challenge, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?, ?)",
    row.id,
    row.userId,
    row.kind,
    row.challenge,
    row.createdAt,
    row.expiresAt
  );

  return row;
};

// Retrieve a valid WebAuthn challenge by ID and kind
export const getValidChallenge = async (
  db: Database,
  id: EntityId,
  kind: "register" | "login"
): Promise<WebauthnChallenge | null> => {
  const row = await db.get<WebauthnChallenge>(
    "SELECT id, userId, kind, challenge, createdAt, expiresAt FROM webauthn_challenges WHERE id = ?",
    id
  );

  if (!row) return null;
  if (row.kind !== kind) return null;
  if (row.expiresAt <= nowMs()) return null;

  return row;
};

// Completely delete a WebAuthn challenge by ID
export const deleteChallenge = async (db: Database, id: EntityId): Promise<void> => {
  await db.run("DELETE FROM webauthn_challenges WHERE id = ?", id);
};
