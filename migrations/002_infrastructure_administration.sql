BEGIN;

CREATE TABLE IF NOT EXISTS infra_nodes (
  id text PRIMARY KEY,
  name text NOT NULL,
  hostname text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('linux', 'darwin', 'win32', 'unknown')),
  architecture text NOT NULL,
  role text NOT NULL CHECK (role IN ('controller', 'worker', 'storage', 'database', 'hybrid')),
  status text NOT NULL CHECK (status IN ('online', 'degraded', 'offline', 'maintenance')),
  labels text[] NOT NULL DEFAULT ARRAY[]::text[],
  capabilities text[] NOT NULL DEFAULT ARRAY[]::text[],
  agent_version text NOT NULL,
  capacity jsonb NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  registered_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS infra_nodes_status_idx ON infra_nodes (status);
CREATE INDEX IF NOT EXISTS infra_nodes_last_seen_idx ON infra_nodes (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS infra_nodes_capabilities_gin_idx ON infra_nodes USING gin (capabilities);

CREATE TABLE IF NOT EXISTS infra_metrics (
  id uuid PRIMARY KEY,
  node_id text NOT NULL REFERENCES infra_nodes(id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL,
  cpu_utilization double precision NOT NULL CHECK (cpu_utilization >= 0 AND cpu_utilization <= 1),
  load1 double precision NOT NULL CHECK (load1 >= 0),
  memory_used_bytes double precision NOT NULL CHECK (memory_used_bytes >= 0),
  swap_used_bytes double precision NOT NULL CHECK (swap_used_bytes >= 0),
  disk_used_bytes double precision NOT NULL CHECK (disk_used_bytes >= 0),
  temperature_c double precision,
  network_rx_bytes double precision,
  network_tx_bytes double precision,
  process_count integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS infra_metrics_node_time_idx ON infra_metrics (node_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS infra_services (
  id text PRIMARY KEY,
  node_id text NOT NULL REFERENCES infra_nodes(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL,
  endpoint text,
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'unavailable', 'unknown')),
  last_checked_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS infra_services_node_idx ON infra_services (node_id, name);

CREATE TABLE IF NOT EXISTS infra_alerts (
  id uuid PRIMARY KEY,
  node_id text NOT NULL REFERENCES infra_nodes(id) ON DELETE CASCADE,
  kind text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  status text NOT NULL CHECK (status IN ('open', 'resolved')),
  dedupe_key text NOT NULL,
  summary text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  resolved_at timestamptz,
  resolved_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS infra_alerts_open_dedupe_idx
  ON infra_alerts (dedupe_key)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS infra_alerts_node_status_idx ON infra_alerts (node_id, status, opened_at DESC);

CREATE TABLE IF NOT EXISTS infra_incidents (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  status text NOT NULL CHECK (status IN ('open', 'mitigating', 'resolved')),
  node_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  alert_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  summary text NOT NULL,
  root_cause text,
  resolution text,
  opened_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS infra_incidents_status_idx ON infra_incidents (status, opened_at DESC);

CREATE TABLE IF NOT EXISTS infra_actions (
  id uuid PRIMARY KEY,
  node_id text NOT NULL REFERENCES infra_nodes(id) ON DELETE RESTRICT,
  incident_id uuid REFERENCES infra_incidents(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN (
    'health-check', 'drain-node', 'resume-node', 'restart-service', 'verify-backup', 'rotate-logs'
  )),
  target text NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk text NOT NULL CHECK (risk IN ('low', 'moderate', 'high', 'critical')),
  status text NOT NULL CHECK (status IN (
    'proposed', 'approved', 'rejected', 'executing', 'succeeded', 'failed', 'cancelled'
  )),
  dry_run boolean NOT NULL,
  requested_by text NOT NULL,
  approved_by text,
  approved_at timestamptz,
  approval_scope text,
  executed_at timestamptz,
  result jsonb,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS infra_actions_node_time_idx ON infra_actions (node_id, created_at DESC);
CREATE INDEX IF NOT EXISTS infra_actions_status_idx ON infra_actions (status, created_at DESC);

CREATE TABLE IF NOT EXISTS infra_backups (
  id text PRIMARY KEY,
  node_id text NOT NULL REFERENCES infra_nodes(id) ON DELETE CASCADE,
  name text NOT NULL,
  source text NOT NULL,
  repository text NOT NULL,
  status text NOT NULL CHECK (status IN ('unknown', 'healthy', 'stale', 'failed')),
  last_successful_at timestamptz,
  last_verified_at timestamptz,
  verification_method text,
  restore_point text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS infra_backups_node_idx ON infra_backups (node_id, name);

CREATE TABLE IF NOT EXISTS infra_backup_verifications (
  id uuid PRIMARY KEY,
  backup_id text NOT NULL REFERENCES infra_backups(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL,
  success boolean NOT NULL,
  method text NOT NULL,
  detail text NOT NULL,
  performed_by text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS infra_backup_verifications_backup_time_idx
  ON infra_backup_verifications (backup_id, verified_at DESC);

CREATE TABLE IF NOT EXISTS infra_events (
  id uuid PRIMARY KEY,
  node_id text REFERENCES infra_nodes(id) ON DELETE SET NULL,
  action_id uuid REFERENCES infra_actions(id) ON DELETE SET NULL,
  incident_id uuid REFERENCES infra_incidents(id) ON DELETE SET NULL,
  type text NOT NULL,
  actor text NOT NULL,
  summary text NOT NULL,
  occurred_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS infra_events_time_idx ON infra_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS infra_events_node_idx ON infra_events (node_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS infra_events_action_idx ON infra_events (action_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS infra_events_incident_idx ON infra_events (incident_id, occurred_at DESC);

COMMIT;
