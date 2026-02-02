import type { Database } from "sqlite";
import { randomBytes } from "node:crypto";
import type { EntityId, Timestamps, Expirable } from "../types/projectTypes.ts";

// Helper functions for time calculations
const nowMs = (): number => Date.now();
const hoursFromNow = (hours: number): number =>
  nowMs() + hours * 60 * 60 * 1000;

// Generate a random 32-character hexadecimal string as invite code 
const makeCode = (): EntityId =>
  randomBytes(16).toString("hex");

// InviteCode type definition
export type InviteCode = {
  code: EntityId;
  usedAt: number | null;
  usedByUserId: EntityId | null;
} & Timestamps &
  Expirable;

// Create a new invite code with specified TTL in hours
export const createInvite = async (
  db: Database,
  ttlHours: number
): Promise<InviteCode> => {
  const invite: InviteCode = {
    code: makeCode(),
    createdAt: nowMs(),
    expiresAt: hoursFromNow(ttlHours),
    usedAt: null,
    usedByUserId: null
  };

// Insert the new invite code into the database
  await db.run(
    `INSERT INTO invite_codes
     (code, createdAt, expiresAt, usedAt, usedByUserId)
     VALUES (?, ?, ?, ?, ?)`,
    invite.code,
    invite.createdAt,
    invite.expiresAt,
    invite.usedAt,
    invite.usedByUserId
  );

  return invite;
};

export const getValidInvite = async (
  db: Database,
  code: EntityId
): Promise<InviteCode | null> => {
  const row = await db.get<InviteCode>(
    `SELECT code, createdAt, expiresAt, usedAt, usedByUserId
     FROM invite_codes
     WHERE code = ?`,
    code
  );

  if (!row) return null;
  if (row.usedAt !== null) return null;
  if (row.expiresAt <= nowMs()) return null;

  return row;
};

export const markInviteUsed = async (
  db: Database,
  code: EntityId,
  userId: EntityId
): Promise<void> => {
  await db.run(
    `UPDATE invite_codes
     SET usedAt = ?, usedByUserId = ?
     WHERE code = ?`,
    nowMs(),
    userId,
    code
  );
};
