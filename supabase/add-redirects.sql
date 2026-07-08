-- Vanity redirects: naxcal.com/go/{slug} -> destination_url.
CREATE TABLE IF NOT EXISTS redirects (
  slug TEXT PRIMARY KEY,
  destination_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;
-- No public policies: reads/writes go through the service role (admin API + /go route).
