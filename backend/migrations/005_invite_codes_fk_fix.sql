PRAGMA foreign_keys = OFF;

ALTER TABLE invite_codes RENAME TO invite_codes_old;

CREATE TABLE invite_codes (
  code TEXT PRIMARY KEY,
  createdAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL,
  usedAt INTEGER,
  usedByUserId TEXT,
  FOREIGN KEY (usedByUserId) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO invite_codes (code, createdAt, expiresAt, usedAt, usedByUserId)
SELECT code, createdAt, expiresAt, usedAt, usedByUserId
FROM invite_codes_old;

DROP TABLE invite_codes_old;

CREATE INDEX IF NOT EXISTS idx_invite_codes_expiresAt ON invite_codes(expiresAt);
CREATE INDEX IF NOT EXISTS idx_invite_codes_usedAt ON invite_codes(usedAt);

PRAGMA foreign_keys = ON;