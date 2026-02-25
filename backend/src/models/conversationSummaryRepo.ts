import type { Database } from "sqlite";
import { uuidv7 } from "../utils/uuidv7.ts";
import type { EntityId, Timestamps, Expirable, ActivityTracked } from "../types/projectTypes.ts";

const nowMs = (): number => Date.now();
const daysFromNow = (days: number): number => nowMs() + days * 24 * 60 * 60 * 1000;

// Conversation summary data model and repository functions
export type ConversationSummaryRow = {
  id: EntityId;
  userId: EntityId;
  conversationId: EntityId;
  summaryText: string;
} & Timestamps &
  ActivityTracked &
  Expirable;

// Upsert function to update or insert conversation summary for a user and conversation
export const upsertConversationSummary = async (
  db: Database,
  input: { userId: EntityId; conversationId: EntityId; summaryText: string; ttlDays: number },
): Promise<void> => {
  const ts = nowMs();
  const id = uuidv7(ts);

  await db.run(
    `INSERT INTO conversation_summary
      (id, userId, conversationId, summaryText, createdAt, lastActiveAt, expiresAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(userId, conversationId) DO UPDATE SET
       summaryText = excluded.summaryText,
       lastActiveAt = excluded.lastActiveAt,
       expiresAt = excluded.expiresAt`,
    id,
    input.userId,
    input.conversationId,
    input.summaryText,
    ts,
    ts,
    daysFromNow(input.ttlDays),
  );
};

// Function to get conversation summary for a user and conversation
export const getConversationSummary = async (
  db: Database,
  userId: EntityId,
  conversationId: EntityId,
): Promise<ConversationSummaryRow | null> => {
  const row = await db.get<ConversationSummaryRow>(
    `SELECT id, userId, conversationId, summaryText, createdAt, lastActiveAt, expiresAt
     FROM conversation_summary
     WHERE userId = ? AND conversationId = ?
     LIMIT 1`,
    userId,
    conversationId,
  );

  return (row as unknown as ConversationSummaryRow) ?? null;
};