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


CREATE TABLE IF NOT EXISTS qr_links (
  qrId TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  lastSeenAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qr_links_userId ON qr_links(userId);
CREATE INDEX IF NOT EXISTS idx_qr_links_lastSeenAt ON qr_links(lastSeenAt);


CREATE TABLE IF NOT EXISTS qr_resolutions (
  id TEXT PRIMARY KEY,
  qrId TEXT NOT NULL,
  userId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qr_resolutions_expiresAt ON qr_resolutions(expiresAt);
CREATE INDEX IF NOT EXISTS idx_qr_resolutions_qrId ON qr_resolutions(qrId);

CREATE TABLE IF NOT EXISTS passkeys (
  userId TEXT PRIMARY KEY,
  credentialId TEXT NOT NULL,
  publicKey TEXT NOT NULL,
  counter INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  kind TEXT NOT NULL,
  challenge TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expiresAt ON webauthn_challenges(expiresAt);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_userId ON webauthn_challenges(userId);


CREATE TABLE IF NOT EXISTS login_proofs (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  resolutionId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL,
  usedAt INTEGER,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resolutionId) REFERENCES qr_resolutions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_login_proofs_expiresAt ON login_proofs(expiresAt);
CREATE INDEX IF NOT EXISTS idx_login_proofs_usedAt ON login_proofs(usedAt);
CREATE INDEX IF NOT EXISTS idx_login_proofs_userId ON login_proofs(userId);
CREATE INDEX IF NOT EXISTS idx_login_proofs_resolutionId ON login_proofs(resolutionId);
