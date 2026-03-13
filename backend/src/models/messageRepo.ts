import type { Database } from "sqlite";
import { uuidv7 } from "../utils/uuidv7.ts";
import type { EntityId, Timestamps, Expirable, ActivityTracked } from "../types/projectTypes.ts";

// Helper for current timestamp in milliseconds
const nowMs = (): number => Date.now();

// Calculate expiration timestamp based on days from now
const daysFromNow = (days: number): number => nowMs() + days * 24 * 60 * 60 * 1000;

export type MessageRole = "user" | "assistant";

// Data structure for a message record in the database
export type MessageRow = {
  id: EntityId;
  userId: EntityId;
  conversationId: EntityId;
  role: MessageRole;
  content: string;
} & Timestamps &
  ActivityTracked &
  Expirable;

// Insert a new message into the database with UUIDv7
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

// Update existing message content and refresh its expiration
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

// Retrieve a limited list of recent messages for a specific conversation
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

// Fetch a single message by its ID and user ownership
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

// Delete a specific message by ID
export const deleteMessageById = async (
  db: Database,
  userId: EntityId,
  id: EntityId,
): Promise<boolean> => {
  const res = await db.run(
    "DELETE FROM messages WHERE userId = ? AND id = ?",
    userId,
    id,
  );

  return (res?.changes ?? 0) > 0;
};

// Delete all messages associated with a specific conversation
export const deleteConversationMessages = async (
  db: Database,
  userId: EntityId,
  conversationId: EntityId,
): Promise<void> => {
  await db.run(
    "DELETE FROM messages WHERE userId = ? AND conversationId = ?",
    userId,
    conversationId,
  );
};