CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  createdAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL,
  usedAt INTEGER,
  usedByUserId TEXT,
  FOREIGN KEY (usedByUserId) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_expiresAt ON invite_codes(expiresAt);
CREATE INDEX IF NOT EXISTS idx_invite_codes_usedAt ON invite_codes(usedAt);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions(expiresAt);
