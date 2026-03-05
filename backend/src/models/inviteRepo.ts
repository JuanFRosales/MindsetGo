import type { Database } from "sqlite";
import { randomBytes } from "node:crypto";
import type { EntityId, Timestamps, Expirable } from "../types/projectTypes.ts";

// Helper functions for time calculations
const nowMs = (): number => Date.now();
const hoursFromNow = (hours: number): number => nowMs() + hours * 60 * 60 * 1000;

const yearsFromNow = (years: number): number => nowMs() + years * 365 * 24 * 60 * 60 * 1000;

const makeCode = (): EntityId => randomBytes(16).toString("hex");

export type InviteCode = {
  code: EntityId;
  usedAt: number | null;
  usedByUserId: EntityId | null;
} & Timestamps &
  Expirable;

  // Invite code management functions for creating, retrieving, and marking invites as used.
export const createInvite = async (db: Database, ttlHours: number): Promise<InviteCode> => {
  const invite: InviteCode = {
    code: makeCode(),
    createdAt: nowMs(),
    expiresAt: hoursFromNow(ttlHours),
    usedAt: null,
    usedByUserId: null,
  };

  await db.run(
    `INSERT INTO invite_codes
     (code, createdAt, expiresAt, usedAt, usedByUserId)
     VALUES (?, ?, ?, ?, ?)`,
    invite.code,
    invite.createdAt,
    invite.expiresAt,
    invite.usedAt,
    invite.usedByUserId,
  );

  return invite;
};

// Function to retrieve an invite code by its code value, returning null if not found.
export const getInviteByCode = async (db: Database, code: EntityId): Promise<InviteCode | null> => {
  const row = await db.get<InviteCode>(
    `SELECT code, createdAt, expiresAt, usedAt, usedByUserId
     FROM invite_codes
     WHERE code = ?`,
    code,
  );

  return row ?? null;
};

// Function to validate an invite code for login, checking if it exists, is not expired, and has not been used.
export const getInviteForLogin = async (db: Database, code: EntityId): Promise<InviteCode | null> => {
  const row = await getInviteByCode(db, code);
  if (!row) return null;

  if (row.usedByUserId) return row;

  if (row.expiresAt <= nowMs()) return null;
  if (row.usedAt !== null) return null;

  return row;
};

// Function to mark an invite code as used by a specific user, updating the usedAt timestamp and usedByUserId.

export const markInviteUsed = async (db: Database, code: EntityId, userId: EntityId): Promise<void> => {
  const ts = nowMs();

  await db.run(
    `UPDATE invite_codes
     SET usedAt = ?, usedByUserId = ?, expiresAt = ?
     WHERE code = ?`,
    ts,
    userId,
    yearsFromNow(10),
    code,
  );
};