import type { Database } from "sqlite";
import { uuidv7 } from "../utils/uuidv7.ts";
import type { EntityId, Timestamps, Expirable, ActivityTracked } from "../types/projectTypes.ts";

const nowMs = (): number => Date.now();
const daysFromNow = (days: number): number => nowMs() + days * 24 * 60 * 60 * 1000;

export type MessageRole = "user" | "assistant";

export type MessageRow = {
  id: EntityId;
  userId: EntityId;
  conversationId: EntityId;
  role: MessageRole;
  content: string;
} & Timestamps &
  ActivityTracked &
  Expirable;

export const createMessage = async (
  db: Database,
  input: {
    userId: EntityId;
    conversationId: EntityId;
    role: MessageRole;
    content: string;
    ttlDays: number;
  },
): Promise<MessageRow> => {
  const ts = nowMs();
  const row: MessageRow = {
    id: uuidv7(ts),
    userId: input.userId,
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    createdAt: ts,
    lastActiveAt: ts,
    expiresAt: daysFromNow(input.ttlDays),
  };

  await db.run(
    `INSERT INTO messages
     (id, userId, conversationId, role, content, createdAt, lastActiveAt, expiresAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.userId,
    row.conversationId,
    row.role,
    row.content,
    row.createdAt,
    row.lastActiveAt,
    row.expiresAt,
  );

  return row;
};

export const updateMessageContent = async (
  db: Database,
  id: EntityId,
  content: string,
  ttlDays: number,
): Promise<void> => {
  const ts = nowMs();
  await db.run(
    "UPDATE messages SET content = ?, lastActiveAt = ?, expiresAt = ? WHERE id = ?",
    content,
    ts,
    daysFromNow(ttlDays),
    id,
  );
};

export const listRecentMessages = async (
  db: Database,
  userId: EntityId,
  conversationId: EntityId,
  limit: number,
): Promise<MessageRow[]> => {
  const safeLimit = Math.max(1, Math.min(200, limit));
  const rows = await db.all<MessageRow[]>(
    `SELECT id, userId, conversationId, role, content, createdAt, lastActiveAt, expiresAt
     FROM messages
     WHERE userId = ? AND conversationId = ?
     ORDER BY createdAt DESC
     LIMIT ?`,
    userId,
    conversationId,
    safeLimit,
  );

  return (rows as unknown as MessageRow[]) ?? [];
};

export const getMessageById = async (
  db: Database,
  userId: EntityId,
  id: EntityId,
): Promise<MessageRow | null> => {
  const row = await db.get<MessageRow>(
    `SELECT id, userId, conversationId, role, content, createdAt, lastActiveAt, expiresAt
     FROM messages
     WHERE userId = ? AND id = ?
     LIMIT 1`,
    userId,
    id,
  );

  return (row as unknown as MessageRow) ?? null;
};