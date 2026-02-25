PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  conversationId TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  lastActiveAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_userId_createdAt ON messages(userId, createdAt);
CREATE INDEX IF NOT EXISTS idx_messages_conversationId_createdAt ON messages(conversationId, createdAt);
CREATE INDEX IF NOT EXISTS idx_messages_expiresAt ON messages(expiresAt);