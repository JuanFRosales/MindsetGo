import type { Database } from "sqlite";
import { uuidv7 } from "../utils/uuidv7.ts";
import type { EntityId, Timestamps, Expirable, ActivityTracked } from "../types/projectTypes.ts";

const nowMs = (): number => Date.now();
const daysFromNow = (days: number): number => nowMs() + days * 24 * 60 * 60 * 1000;

export type ProfileStateRow = {
  id: EntityId;
  userId: EntityId;
  stateJson: string;
} & Timestamps &
  ActivityTracked &
  Expirable;
// Upsert function to update or insert profile state for a user
export const upsertProfileState = async (
  db: Database,
  input: { userId: EntityId; stateJson: string; ttlDays: number },
): Promise<void> => {
  const ts = nowMs();
  const id = uuidv7(ts);

  await db.run(
    `INSERT INTO profile_state (id, userId, stateJson, createdAt, lastActiveAt, expiresAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(userId) DO UPDATE SET
       stateJson = excluded.stateJson,
       lastActiveAt = excluded.lastActiveAt,
       expiresAt = excluded.expiresAt`,
    id,
    input.userId,
    input.stateJson,
    ts,
    ts,
    daysFromNow(input.ttlDays),
  );
};
// Function to get profile state for a user 
export const getProfileState = async (
  db: Database,
  userId: EntityId,
): Promise<ProfileStateRow | null> => {
  const row = await db.get<ProfileStateRow>(
    `SELECT id, userId, stateJson, createdAt, lastActiveAt, expiresAt
     FROM profile_state
     WHERE userId = ?
     LIMIT 1`,
    userId,
  );

  return (row as unknown as ProfileStateRow) ?? null;
};