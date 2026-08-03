BEGIN;

CREATE TABLE IF NOT EXISTS analytics_sources (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('postgres','spreadsheet','csv','json','api','event-stream','manual')),
  status text NOT NULL CHECK (status IN ('active','disabled')),
  sensitivity text NOT NULL CHECK (sensitivity IN ('public','internal','confidential','restricted')),
  owner text NOT NULL,
  updated_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_sources_status_idx ON analytics_sources (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS analytics_sources_owner_idx ON analytics_sources (owner, updated_at DESC);

CREATE TABLE IF NOT EXISTS analytics_schema_snapshots (
  id uuid PRIMARY KEY,
  source_id text NOT NULL REFERENCES analytics_sources(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  fingerprint char(64) NOT NULL,
  observed_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  UNIQUE (source_id, version)
);
CREATE INDEX IF NOT EXISTS analytics_schema_source_time_idx
  ON analytics_schema_snapshots (source_id, version DESC, observed_at DESC);

CREATE TABLE IF NOT EXISTS analytics_metrics (
  id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES analytics_sources(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('candidate','approved','rejected','deprecated')),
  version integer NOT NULL CHECK (version > 0),
  updated_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_metrics_source_status_idx
  ON analytics_metrics (source_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS analytics_metric_observations (
  id uuid PRIMARY KEY,
  metric_id text NOT NULL REFERENCES analytics_metrics(id) ON DELETE CASCADE,
  source_id text NOT NULL REFERENCES analytics_sources(id) ON DELETE RESTRICT,
  computed_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_metric_observation_metric_time_idx
  ON analytics_metric_observations (metric_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS analytics_query_runs (
  id uuid PRIMARY KEY,
  source_id text NOT NULL REFERENCES analytics_sources(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('planned','running','succeeded','failed','rejected')),
  created_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_query_source_status_time_idx
  ON analytics_query_runs (source_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_quality_rules (
  id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES analytics_sources(id) ON DELETE CASCADE,
  dataset text NOT NULL,
  active boolean NOT NULL,
  updated_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_quality_rules_lookup_idx
  ON analytics_quality_rules (source_id, dataset, active, updated_at DESC);

CREATE TABLE IF NOT EXISTS analytics_quality_runs (
  id uuid PRIMARY KEY,
  source_id text NOT NULL REFERENCES analytics_sources(id) ON DELETE RESTRICT,
  dataset text NOT NULL,
  passed boolean NOT NULL,
  executed_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_quality_runs_lookup_idx
  ON analytics_quality_runs (source_id, dataset, executed_at DESC);

CREATE TABLE IF NOT EXISTS analytics_dataset_profiles (
  id uuid PRIMARY KEY,
  source_id text NOT NULL REFERENCES analytics_sources(id) ON DELETE RESTRICT,
  dataset text NOT NULL,
  profiled_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_profiles_lookup_idx
  ON analytics_dataset_profiles (source_id, dataset, profiled_at DESC);

CREATE TABLE IF NOT EXISTS analytics_lineage (
  id uuid PRIMARY KEY,
  from_kind text NOT NULL CHECK (from_kind IN ('source','dataset','schema','query','metric','quality-run','forecast','report')),
  from_id text NOT NULL,
  to_kind text NOT NULL CHECK (to_kind IN ('source','dataset','schema','query','metric','quality-run','forecast','report')),
  to_id text NOT NULL,
  created_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_lineage_from_idx ON analytics_lineage (from_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_lineage_to_idx ON analytics_lineage (to_id, created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_forecast_evaluations (
  id uuid PRIMARY KEY,
  source_id text REFERENCES analytics_sources(id) ON DELETE SET NULL,
  dataset text NOT NULL,
  evaluated_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_forecast_lookup_idx
  ON analytics_forecast_evaluations (source_id, dataset, evaluated_at DESC);

CREATE TABLE IF NOT EXISTS analytics_reports (
  id text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('candidate','approved','disabled')),
  updated_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_reports_status_idx ON analytics_reports (status, updated_at DESC);

COMMIT;
