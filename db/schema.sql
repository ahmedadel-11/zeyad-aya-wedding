CREATE TABLE IF NOT EXISTS wedding_wishes (
  id UUID PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  message VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rate_key VARCHAR(64) UNIQUE
);

CREATE INDEX IF NOT EXISTS wedding_wishes_created_at_idx
ON wedding_wishes (created_at DESC);
