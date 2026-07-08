-- Marketing-email suppression list (unsubscribes for people who are not
-- necessarily registered users, e.g. cold-outreach recipients).
CREATE TABLE IF NOT EXISTS email_suppressions (
  email TEXT PRIMARY KEY,
  reason TEXT DEFAULT 'unsubscribed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;
-- No public policies: only the service role (server-side) reads/writes this table.
