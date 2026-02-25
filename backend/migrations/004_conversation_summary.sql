PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS conversation_summary (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  conversationId TEXT NOT NULL,
  summaryText TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  lastActiveAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_summary_user_conv
ON conversation_summary(userId, conversationId);

CREATE INDEX IF NOT EXISTS idx_conversation_summary_expiresAt
ON conversation_summary(expiresAt);