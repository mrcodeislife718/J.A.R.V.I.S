CREATE TABLE IF NOT EXISTS support_entities (
  entity_type TEXT NOT NULL,
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_type, id)
);

CREATE INDEX IF NOT EXISTS support_entities_workspace_type_updated_idx
  ON support_entities (workspace_id, entity_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS support_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  type TEXT NOT NULL,
  actor TEXT NOT NULL,
  summary TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS support_events_workspace_time_idx
  ON support_events (workspace_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS support_events_entity_time_idx
  ON support_events (entity_id, occurred_at DESC);
