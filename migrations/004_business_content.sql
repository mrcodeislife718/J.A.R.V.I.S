BEGIN;

CREATE TABLE IF NOT EXISTS business_entities (
  entity_type text NOT NULL CHECK (entity_type IN (
    'organization', 'project', 'decision', 'sop', 'financial-scenario', 'risk', 'meeting', 'weekly-report'
  )),
  id text NOT NULL,
  organization_id text NOT NULL,
  body jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (entity_type, id)
);

CREATE INDEX IF NOT EXISTS business_entities_org_type_idx
  ON business_entities (organization_id, entity_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS business_events (
  id uuid PRIMARY KEY,
  organization_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  type text NOT NULL,
  actor text NOT NULL,
  summary text NOT NULL,
  occurred_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS business_events_org_time_idx
  ON business_events (organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS business_events_entity_idx
  ON business_events (entity_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS content_entities (
  entity_type text NOT NULL CHECK (entity_type IN (
    'brand', 'source', 'brief', 'draft', 'publication-plan', 'performance', 'experiment'
  )),
  id text NOT NULL,
  brand_id text NOT NULL,
  body jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (entity_type, id)
);

CREATE INDEX IF NOT EXISTS content_entities_brand_type_idx
  ON content_entities (brand_id, entity_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS content_events (
  id uuid PRIMARY KEY,
  brand_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  type text NOT NULL,
  actor text NOT NULL,
  summary text NOT NULL,
  occurred_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS content_events_brand_time_idx
  ON content_events (brand_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS content_events_entity_idx
  ON content_events (entity_id, occurred_at DESC);

COMMIT;
