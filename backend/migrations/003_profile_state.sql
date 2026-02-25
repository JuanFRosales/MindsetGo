PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profile_state (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  stateJson TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  lastActiveAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_state_userId ON profile_state(userId);
CREATE INDEX IF NOT EXISTS idx_profile_state_expiresAt ON profile_state(expiresAt);