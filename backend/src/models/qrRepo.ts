import type { Database } from "sqlite";
import type { EntityId, Timestamps } from "../types/projectTypes.ts";

// Helper function to get current time in milliseconds
const nowMs = (): number => Date.now();

export type QrLink = {
  qrId: EntityId;
  userId: EntityId;
  lastSeenAt: number;
} & Timestamps;

// Retrieve a QR link by its ID
export const getQrLink = async (db: Database, qrId: EntityId): Promise<QrLink | null> => {
  const row = await db.get<QrLink>(
    "SELECT qrId, userId, createdAt, lastSeenAt FROM qr_links WHERE qrId = ?",
    qrId
  );
  return row ?? null;
};

// Create a new QR link entry in the database
export const createQrLink = async (db: Database, qrId: EntityId, userId: EntityId): Promise<QrLink> => {
  const createdAt = nowMs();
  const link: QrLink = {
    qrId,
    userId,
    createdAt,
    lastSeenAt: createdAt
  };

 // Insert the new QR link into the database 
  await db.run(
    "INSERT INTO qr_links (qrId, userId, createdAt, lastSeenAt) VALUES (?, ?, ?, ?)",
    link.qrId,
    link.userId,
    link.createdAt,
    link.lastSeenAt
  );

  return link;
};

// Update the lastSeenAt timestamp of a QR link
export const touchQrLink = async (db: Database, qrId: EntityId): Promise<void> => {
  const ts = nowMs();
  await db.run("UPDATE qr_links SET lastSeenAt = ? WHERE qrId = ?", ts, qrId);
};