import type { Database } from "sqlite";
import type { EntityId, Timestamps, Expirable } from "../types/projectTypes.ts";
import { uuidv7 } from "../utils/uuidv7.ts";

const nowMs = (): number => Date.now();
const minutesFromNow = (m: number): number => nowMs() + m * 60 * 1000;  

// QrResolution type definition
export type QrResolution = {
  id: EntityId;
  qrId: EntityId;
  userId: EntityId;
} & Timestamps &
  Expirable;

// Create a new QR resolution entry in the database
export const createQrResolution = async (
  db: Database,
  qrId: EntityId,
  userId: EntityId,
  ttlMinutes: number
): Promise<QrResolution> => {
  const createdAt = nowMs();
  const expiresAt = minutesFromNow(ttlMinutes);
  const r: QrResolution = {
    id: uuidv7(createdAt),
    qrId,
    userId,
    createdAt,
    expiresAt
  };
// Insert the new QR resolution into the database
  await db.run(
    "INSERT INTO qr_resolutions (id, qrId, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?)",
    r.id,
    r.qrId,
    r.userId,
    r.createdAt,
    r.expiresAt
  );

  return r;
};

// Retrieve a valid (non-expired) QR resolution by ID
export const getValidQrResolution = async (
  db: Database,
  id: EntityId
): Promise<QrResolution | null> => {
  const row = await db.get<QrResolution>(
    "SELECT id, qrId, userId, createdAt, expiresAt FROM qr_resolutions WHERE id = ?",
    id
  );

  if (!row) {
    return null;
  }

  // Check if expired
  if (row.expiresAt <= nowMs()) {
    return null;
  }

  return row;
};

// Completely delete a QR resolution by ID
export const deleteQrResolution = async (db: Database, id: EntityId): Promise<void> => {
  await db.run("DELETE FROM qr_resolutions WHERE id = ?", id);
};