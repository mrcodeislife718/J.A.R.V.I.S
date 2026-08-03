import type { Pool, QueryResultRow } from "pg";
import type { PkmRepository } from "./repository.js";
import type {
  PkmKnowledgeItem,
  PkmRecordStatus,
  PkmRelation,
  PkmSearchHit,
  PkmSource,
  PkmTimelineEvent,
  PkmWorkspace,
} from "./types.js";

interface WorkspaceRow extends QueryResultRow {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  created_at: string | Date;
  updated_at: string | Date;
}

interface SourceRow extends QueryResultRow {
  id: string;
  workspace_id: string;
  title: string;
  kind: PkmSource["kind"];
  authorship: PkmSource["authorship"];
  external_uri: string | null;
  blob_key: string;
  content_hash: string;
  metadata: Record<string, unknown>;
  created_at: string | Date;
}

interface ItemRow extends QueryResultRow {
  id: string;
  workspace_id: string;
  source_id: string;
  kind: PkmKnowledgeItem["kind"];
  title: string;
  body: string;
  authorship: PkmKnowledgeItem["authorship"];
  confidence: number;
  status: PkmKnowledgeItem["status"];
  evidence_state: PkmKnowledgeItem["evidenceState"];
  source_start: number | null;
  source_end: number | null;
  valid_from: string | Date | null;
  valid_until: string | Date | null;
  supersedes_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string | Date;
  updated_at: string | Date;
  search_rank?: number;
}

interface RelationRow extends QueryResultRow {
  id: string;
  workspace_id: string;
  from_item_id: string;
  to_item_id: string;
  type: PkmRelation["type"];
  confidence: number;
  created_at: string | Date;
}

interface TimelineRow extends QueryResultRow {
  id: string;
  workspace_id: string;
  item_id: string | null;
  source_id: string | null;
  type: string;
  summary: string;
  occurred_at: string | Date;
  metadata: Record<string, unknown>;
}

const iso = (value: string | Date): string => new Date(value).toISOString();
const nullableIso = (value: string | Date | null): string | null => (value === null ? null : iso(value));

const mapWorkspace = (row: WorkspaceRow): PkmWorkspace => ({
  id: row.id,
  name: row.name,
  description: row.description,
  status: row.status,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

const mapSource = (row: SourceRow): PkmSource => ({
  id: row.id,
  workspaceId: row.workspace_id,
  title: row.title,
  kind: row.kind,
  authorship: row.authorship,
  externalUri: row.external_uri,
  blobKey: row.blob_key,
  contentHash: row.content_hash,
  metadata: row.metadata,
  createdAt: iso(row.created_at),
});

const mapItem = (row: ItemRow): PkmKnowledgeItem => ({
  id: row.id,
  workspaceId: row.workspace_id,
  sourceId: row.source_id,
  kind: row.kind,
  title: row.title,
  body: row.body,
  authorship: row.authorship,
  confidence: Number(row.confidence),
  status: row.status,
  evidenceState: row.evidence_state,
  sourceStart: row.source_start,
  sourceEnd: row.source_end,
  validFrom: nullableIso(row.valid_from),
  validUntil: nullableIso(row.valid_until),
  supersedesId: row.supersedes_id,
  metadata: row.metadata,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

const mapRelation = (row: RelationRow): PkmRelation => ({
  id: row.id,
  workspaceId: row.workspace_id,
  fromItemId: row.from_item_id,
  toItemId: row.to_item_id,
  type: row.type,
  confidence: Number(row.confidence),
  createdAt: iso(row.created_at),
});

const mapTimeline = (row: TimelineRow): PkmTimelineEvent => ({
  id: row.id,
  workspaceId: row.workspace_id,
  itemId: row.item_id,
  sourceId: row.source_id,
  type: row.type,
  summary: row.summary,
  occurredAt: iso(row.occurred_at),
  metadata: row.metadata,
});

export class PostgresPkmRepository implements PkmRepository {
  constructor(private readonly pool: Pool) {}

  async createWorkspace(workspace: PkmWorkspace): Promise<void> {
    await this.pool.query(
      `INSERT INTO pkm_workspaces (id, name, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [workspace.id, workspace.name, workspace.description, workspace.status, workspace.createdAt, workspace.updatedAt],
    );
  }

  async getWorkspace(id: string): Promise<PkmWorkspace | null> {
    const result = await this.pool.query<WorkspaceRow>("SELECT * FROM pkm_workspaces WHERE id = $1", [id]);
    const row = result.rows[0];
    return row ? mapWorkspace(row) : null;
  }

  async listWorkspaces(): Promise<PkmWorkspace[]> {
    const result = await this.pool.query<WorkspaceRow>("SELECT * FROM pkm_workspaces ORDER BY updated_at DESC");
    return result.rows.map(mapWorkspace);
  }

  async saveWorkspace(workspace: PkmWorkspace): Promise<void> {
    await this.pool.query(
      `INSERT INTO pkm_workspaces (id, name, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at`,
      [workspace.id, workspace.name, workspace.description, workspace.status, workspace.createdAt, workspace.updatedAt],
    );
  }

  async saveSource(source: PkmSource): Promise<void> {
    await this.pool.query(
      `INSERT INTO pkm_sources
       (id, workspace_id, title, kind, authorship, external_uri, blob_key, content_hash, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         external_uri = EXCLUDED.external_uri,
         metadata = EXCLUDED.metadata`,
      [
        source.id,
        source.workspaceId,
        source.title,
        source.kind,
        source.authorship,
        source.externalUri,
        source.blobKey,
        source.contentHash,
        source.metadata,
        source.createdAt,
      ],
    );
  }

  async getSource(id: string): Promise<PkmSource | null> {
    const result = await this.pool.query<SourceRow>("SELECT * FROM pkm_sources WHERE id = $1", [id]);
    const row = result.rows[0];
    return row ? mapSource(row) : null;
  }

  async listSources(workspaceId: string, limit = 100): Promise<PkmSource[]> {
    const result = await this.pool.query<SourceRow>(
      "SELECT * FROM pkm_sources WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT $2",
      [workspaceId, limit],
    );
    return result.rows.map(mapSource);
  }

  async saveItem(item: PkmKnowledgeItem): Promise<void> {
    await this.pool.query(
      `INSERT INTO pkm_knowledge_items
       (id, workspace_id, source_id, kind, title, body, authorship, confidence, status, evidence_state,
        source_start, source_end, valid_from, valid_until, supersedes_id, metadata, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO UPDATE SET
         kind = EXCLUDED.kind,
         title = EXCLUDED.title,
         body = EXCLUDED.body,
         authorship = EXCLUDED.authorship,
         confidence = EXCLUDED.confidence,
         status = EXCLUDED.status,
         evidence_state = EXCLUDED.evidence_state,
         source_start = EXCLUDED.source_start,
         source_end = EXCLUDED.source_end,
         valid_from = EXCLUDED.valid_from,
         valid_until = EXCLUDED.valid_until,
         supersedes_id = EXCLUDED.supersedes_id,
         metadata = EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        item.workspaceId,
        item.sourceId,
        item.kind,
        item.title,
        item.body,
        item.authorship,
        item.confidence,
        item.status,
        item.evidenceState,
        item.sourceStart,
        item.sourceEnd,
        item.validFrom,
        item.validUntil,
        item.supersedesId,
        item.metadata,
        item.createdAt,
        item.updatedAt,
      ],
    );
  }

  async getItem(id: string): Promise<PkmKnowledgeItem | null> {
    const result = await this.pool.query<ItemRow>("SELECT * FROM pkm_knowledge_items WHERE id = $1", [id]);
    const row = result.rows[0];
    return row ? mapItem(row) : null;
  }

  async listItems(
    workspaceId: string,
    options: { kinds?: PkmKnowledgeItem["kind"][]; status?: PkmRecordStatus; limit?: number } = {},
  ): Promise<PkmKnowledgeItem[]> {
    const conditions = ["workspace_id = $1"];
    const values: unknown[] = [workspaceId];
    if (options.status) {
      values.push(options.status);
      conditions.push(`status = $${values.length}`);
    }
    if (options.kinds && options.kinds.length > 0) {
      values.push(options.kinds);
      conditions.push(`kind = ANY($${values.length}::text[])`);
    }
    values.push(options.limit ?? 200);
    const result = await this.pool.query<ItemRow>(
      `SELECT * FROM pkm_knowledge_items
       WHERE ${conditions.join(" AND ")}
       ORDER BY updated_at DESC
       LIMIT $${values.length}`,
      values,
    );
    return result.rows.map(mapItem);
  }

  async lexicalSearch(workspaceId: string, query: string, limit: number): Promise<PkmSearchHit[]> {
    if (query.trim().length === 0) return [];
    const result = await this.pool.query<ItemRow>(
      `WITH search AS (SELECT websearch_to_tsquery('english', $2) AS q)
       SELECT items.*,
         ts_rank_cd(
           to_tsvector('english', coalesce(items.title, '') || ' ' || coalesce(items.body, '')),
           search.q
         ) AS search_rank
       FROM pkm_knowledge_items items, search
       WHERE items.workspace_id = $1
         AND items.status = 'approved'
         AND (
           to_tsvector('english', coalesce(items.title, '') || ' ' || coalesce(items.body, '')) @@ search.q
           OR items.title ILIKE '%' || $2 || '%'
           OR items.body ILIKE '%' || $2 || '%'
         )
       ORDER BY search_rank DESC, items.updated_at DESC
       LIMIT $3`,
      [workspaceId, query, limit],
    );
    return result.rows.map((row, index) => ({
      item: mapItem(row),
      score: Number(row.search_rank ?? 0),
      lexicalRank: index + 1,
      semanticRank: null,
      matchedBy: ["lexical"],
    }));
  }

  async saveRelation(relation: PkmRelation): Promise<void> {
    await this.pool.query(
      `INSERT INTO pkm_relations
       (id, workspace_id, from_item_id, to_item_id, type, confidence, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (from_item_id, to_item_id, type) DO UPDATE SET confidence = EXCLUDED.confidence`,
      [
        relation.id,
        relation.workspaceId,
        relation.fromItemId,
        relation.toItemId,
        relation.type,
        relation.confidence,
        relation.createdAt,
      ],
    );
  }

  async listRelations(workspaceId: string): Promise<PkmRelation[]> {
    const result = await this.pool.query<RelationRow>(
      "SELECT * FROM pkm_relations WHERE workspace_id = $1 ORDER BY created_at DESC",
      [workspaceId],
    );
    return result.rows.map(mapRelation);
  }

  async appendTimeline(event: PkmTimelineEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO pkm_timeline_events
       (id, workspace_id, item_id, source_id, type, summary, occurred_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        event.id,
        event.workspaceId,
        event.itemId,
        event.sourceId,
        event.type,
        event.summary,
        event.occurredAt,
        event.metadata,
      ],
    );
  }

  async listTimeline(workspaceId: string, limit = 100): Promise<PkmTimelineEvent[]> {
    const result = await this.pool.query<TimelineRow>(
      "SELECT * FROM pkm_timeline_events WHERE workspace_id = $1 ORDER BY occurred_at DESC LIMIT $2",
      [workspaceId, limit],
    );
    return result.rows.map(mapTimeline);
  }
}
