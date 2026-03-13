import type { Database } from "sqlite";
import type { EntityId, Timestamps } from "../types/projectTypes.ts";

// Check if a user has at least one passkey registered
export const userHasPasskey = async (db: Database, userId: string): Promise<boolean> => {
  const row = await db.get<{ c: number }>(
   "SELECT COUNT(1) as c FROM passkeys WHERE userId = ?",
    userId,
  );
  return (row?.c ?? 0) > 0;
};

// Data structure for a registered WebAuthn credential
export type Passkey = {
  userId: EntityId;
  credentialId: string;
  publicKey: string;
  counter: number;
} & Timestamps;

// Retrieve passkey data for a specific user
export const getPasskeyByUserId = async (db: Database, userId: EntityId): Promise<Passkey | null> => {
  const row = await db.get<Passkey>(
    "SELECT userId, credentialId, publicKey, counter, createdAt FROM passkeys WHERE userId = ?",
    userId
  );
  return row ?? null;
};

// Create or update the user's single allowed passkey
export const upsertSinglePasskey = async (db: Database, passkey: Passkey): Promise<void> => {
  await db.run(
    `INSERT INTO passkeys (userId, credentialId, publicKey, counter, createdAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(userId) DO UPDATE SET
       credentialId = excluded.credentialId,
       publicKey = excluded.publicKey,
       counter = excluded.counter`,
    passkey.userId,
    passkey.credentialId,
    passkey.publicKey,
    passkey.counter,
    passkey.createdAt
  );
};

// Update the signature counter to prevent replay attacks during authentication
export const updateCounter = async (db: Database, userId: EntityId, counter: number): Promise<void> => {
  await db.run("UPDATE passkeys SET counter = ? WHERE userId = ?", counter, userId);
};