CREATE TABLE IF NOT EXISTS job_offers (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_job_id TEXT NOT NULL,
  source_contract TEXT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  city TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  apply_url TEXT NOT NULL,
  contract TEXT NOT NULL CHECK (contract IN ('alternance', 'stage', 'cdi', 'cdd', 'interim', 'other')),
  classification_reason TEXT NOT NULL CHECK (classification_reason IN ('title', 'source', 'description', 'fallback')),
  raw_offer JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, source_job_id)
);

CREATE INDEX IF NOT EXISTS job_offers_contract_idx ON job_offers (contract);
CREATE INDEX IF NOT EXISTS job_offers_published_at_idx ON job_offers (published_at DESC);
CREATE INDEX IF NOT EXISTS job_offers_location_idx ON job_offers (city, postal_code);
CREATE INDEX IF NOT EXISTS job_offers_search_idx ON job_offers
USING GIN (to_tsvector('french', title || ' ' || company || ' ' || description));
