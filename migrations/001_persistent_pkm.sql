BEGIN;

CREATE TABLE IF NOT EXISTS pkm_workspaces (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text,
  status text NOT NULL CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS pkm_sources (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES pkm_workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('conversation', 'note', 'file', 'research', 'plan', 'import')),
  authorship text NOT NULL CHECK (authorship IN ('user', 'assistant', 'external', 'system', 'mixed')),
  external_uri text,
  blob_key text NOT NULL,
  content_hash char(64) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  UNIQUE (workspace_id, content_hash, title)
);

CREATE TABLE IF NOT EXISTS pkm_knowledge_items (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES pkm_workspaces(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES pkm_sources(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN (
    'concept', 'decision', 'rationale', 'correction', 'standing-rule',
    'unresolved-question', 'next-action', 'evidence', 'assumption',
    'contradiction', 'project-state'
  )),
  title text NOT NULL,
  body text NOT NULL,
  authorship text NOT NULL CHECK (authorship IN ('user', 'assistant', 'external', 'system', 'mixed')),
  confidence double precision NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  status text NOT NULL CHECK (status IN ('candidate', 'approved', 'rejected', 'superseded')),
  evidence_state text NOT NULL CHECK (evidence_state IN ('observed', 'sourced', 'inferred', 'assumed', 'disputed', 'unknown')),
  source_start integer,
  source_end integer,
  valid_from timestamptz,
  valid_until timestamptz,
  supersedes_id uuid REFERENCES pkm_knowledge_items(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CHECK (source_start IS NULL OR source_start >= 0),
  CHECK (source_end IS NULL OR source_end >= source_start)
);

CREATE TABLE IF NOT EXISTS pkm_relations (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES pkm_workspaces(id) ON DELETE CASCADE,
  from_item_id uuid NOT NULL REFERENCES pkm_knowledge_items(id) ON DELETE CASCADE,
  to_item_id uuid NOT NULL REFERENCES pkm_knowledge_items(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('supports', 'contradicts', 'depends-on', 'supersedes', 'relates-to', 'implements')),
  confidence double precision NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at timestamptz NOT NULL,
  UNIQUE (from_item_id, to_item_id, type)
);

CREATE TABLE IF NOT EXISTS pkm_timeline_events (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES pkm_workspaces(id) ON DELETE CASCADE,
  item_id uuid REFERENCES pkm_knowledge_items(id) ON DELETE SET NULL,
  source_id uuid REFERENCES pkm_sources(id) ON DELETE SET NULL,
  type text NOT NULL,
  summary text NOT NULL,
  occurred_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS pkm_sources_workspace_created_idx
  ON pkm_sources (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pkm_items_workspace_status_kind_idx
  ON pkm_knowledge_items (workspace_id, status, kind, updated_at DESC);
CREATE INDEX IF NOT EXISTS pkm_items_full_text_idx
  ON pkm_knowledge_items
  USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, '')));
CREATE INDEX IF NOT EXISTS pkm_relations_workspace_idx
  ON pkm_relations (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pkm_timeline_workspace_time_idx
  ON pkm_timeline_events (workspace_id, occurred_at DESC);

COMMIT;
