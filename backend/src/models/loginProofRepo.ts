import type { Database } from "sqlite";
import { uuidv7 } from "../utils/uuidv7.ts";

export type LoginProof = {
  id: string;
  userId: string;
  resolutionId: string;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
};

const nowMs = (): number => Date.now();
const minutesFromNowMs = (m: number): number => nowMs() + m * 60 * 1000;

// create a login proof for a user with a specific resolution ID and TTL in minutes
export const createLoginProof = async (
  db: Database,
  userId: string,
  resolutionId: string,
  ttlMinutes: number = 5,
): Promise<LoginProof> => {
  const createdAt = nowMs();
  const proof: LoginProof = {
    id: uuidv7(createdAt),
    userId,
    resolutionId,
    createdAt,
    expiresAt: minutesFromNowMs(ttlMinutes),
    usedAt: null,
  };

  await db.run(
    "INSERT INTO login_proofs (id, userId, resolutionId, createdAt, expiresAt, usedAt) VALUES (?, ?, ?, ?, ?, NULL)",
    proof.id,
    proof.userId,
    proof.resolutionId,
    proof.createdAt,
    proof.expiresAt,
  );

  return proof;
};

export const getValidLoginProof = async (
  db: Database,
  id: string,
): Promise<LoginProof | null> => {
  const now = nowMs();
  const row = await db.get<LoginProof>(
    "SELECT id, userId, resolutionId, createdAt, expiresAt, usedAt FROM login_proofs WHERE id = ? AND expiresAt > ? AND usedAt IS NULL",
    id,
    now,
  );
  return row ?? null;
};
// Mark a login proof as used 
export const markLoginProofUsed = async (db: Database, id: string): Promise<boolean> => {
  const usedAt = nowMs();
  const res = await db.run(
    "UPDATE login_proofs SET usedAt = ? WHERE id = ? AND usedAt IS NULL",
    usedAt,
    id,
  );
  return (res.changes ?? 0) > 0;
};

