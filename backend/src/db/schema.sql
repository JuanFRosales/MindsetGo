CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  createdAt INTEGER NOT NULL,
  lastActiveAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_expiresAt ON users(expiresAt);
CREATE INDEX IF NOT EXISTS idx_users_lastActiveAt ON users(lastActiveAt);
