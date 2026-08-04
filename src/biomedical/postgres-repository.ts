import type { Pool } from "pg";
import type { BiomedicalRepository } from "./repository.js";
import type { BiomedicalEntity, BiomedicalEntityType, BiomedicalEvent } from "./types.js";

export class PostgresBiomedicalRepository implements BiomedicalRepository {
  constructor(private readonly pool: Pool) {}

  async save(entity: BiomedicalEntity): Promise<void> {
    await this.pool.query(
      `INSERT INTO biomedical_entities (entity_type, id, workspace_id, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       ON CONFLICT (entity_type, id) DO UPDATE SET
         workspace_id = EXCLUDED.workspace_id,
         body = EXCLUDED.body,
         updated_at = EXCLUDED.updated_at`,
      [entity.entityType, entity.id, entity.workspaceId, JSON.stringify(entity), entity.createdAt, entity.updatedAt],
    );
  }

  async get(type: BiomedicalEntityType, id: string): Promise<BiomedicalEntity | null> {
    const result = await this.pool.query<{ body: BiomedicalEntity }>(
      `SELECT body FROM biomedical_entities WHERE entity_type=$1 AND id=$2`,
      [type, id],
    );
    return result.rows[0]?.body ?? null;
  }

  async list(type: BiomedicalEntityType, options: { workspaceId?: string | undefined; limit?: number | undefined } = {}): Promise<BiomedicalEntity[]> {
    const result = await this.pool.query<{ body: BiomedicalEntity }>(
      `SELECT body FROM biomedical_entities
       WHERE entity_type=$1 AND ($2::text IS NULL OR workspace_id=$2)
       ORDER BY updated_at DESC LIMIT $3`,
      [type, options.workspaceId ?? null, options.limit ?? 500],
    );
    return result.rows.map((row) => row.body);
  }

  async appendEvent(event: BiomedicalEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO biomedical_events
       (id, workspace_id, entity_type, entity_id, type, actor, summary, occurred_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [event.id, event.workspaceId, event.entityType, event.entityId, event.type, event.actor, event.summary, event.occurredAt, JSON.stringify(event.metadata)],
    );
  }

  async listEvents(options: { workspaceId?: string | undefined; entityId?: string | undefined; limit?: number | undefined } = {}): Promise<BiomedicalEvent[]> {
    const result = await this.pool.query<BiomedicalEvent>(
      `SELECT id, workspace_id AS "workspaceId", entity_type AS "entityType",
              entity_id AS "entityId", type, actor, summary,
              occurred_at::text AS "occurredAt", metadata
       FROM biomedical_events
       WHERE ($1::text IS NULL OR workspace_id=$1)
         AND ($2::text IS NULL OR entity_id=$2)
       ORDER BY occurred_at DESC LIMIT $3`,
      [options.workspaceId ?? null, options.entityId ?? null, options.limit ?? 500],
    );
    return result.rows;
  }
}
