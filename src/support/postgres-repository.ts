import type { Pool } from "pg";
import type { SupportRepository } from "./repository.js";
import type { SupportEntity, SupportEntityType, SupportEvent } from "./types.js";

export class PostgresSupportRepository implements SupportRepository {
  constructor(private readonly pool: Pool) {}

  async save(entity: SupportEntity): Promise<void> {
    await this.pool.query(
      `INSERT INTO support_entities (entity_type, id, workspace_id, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       ON CONFLICT (entity_type, id) DO UPDATE SET
         workspace_id = EXCLUDED.workspace_id,
         body = EXCLUDED.body,
         updated_at = EXCLUDED.updated_at`,
      [
        entity.entityType,
        entity.id,
        entity.workspaceId,
        JSON.stringify(entity),
        entity.createdAt,
        entity.updatedAt,
      ],
    );
  }

  async get(type: SupportEntityType, id: string): Promise<SupportEntity | null> {
    const result = await this.pool.query<{ body: SupportEntity }>(
      `SELECT body FROM support_entities WHERE entity_type = $1 AND id = $2`,
      [type, id],
    );
    return result.rows[0]?.body ?? null;
  }

  async list(
    type: SupportEntityType,
    options: { workspaceId?: string | undefined; limit?: number | undefined } = {},
  ): Promise<SupportEntity[]> {
    const result = await this.pool.query<{ body: SupportEntity }>(
      `SELECT body
         FROM support_entities
        WHERE entity_type = $1
          AND ($2::text IS NULL OR workspace_id = $2)
        ORDER BY updated_at DESC
        LIMIT $3`,
      [type, options.workspaceId ?? null, options.limit ?? 500],
    );
    return result.rows.map((row) => row.body);
  }

  async appendEvent(event: SupportEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO support_events (
         id, workspace_id, entity_type, entity_id, type, actor, summary, occurred_at, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [
        event.id,
        event.workspaceId,
        event.entityType,
        event.entityId,
        event.type,
        event.actor,
        event.summary,
        event.occurredAt,
        JSON.stringify(event.metadata),
      ],
    );
  }

  async listEvents(
    options: { workspaceId?: string | undefined; entityId?: string | undefined; limit?: number | undefined } = {},
  ): Promise<SupportEvent[]> {
    const result = await this.pool.query<SupportEvent>(
      `SELECT
         id, workspace_id AS "workspaceId", entity_type AS "entityType",
         entity_id AS "entityId", type, actor, summary,
         occurred_at::text AS "occurredAt", metadata
       FROM support_events
       WHERE ($1::text IS NULL OR workspace_id = $1)
         AND ($2::text IS NULL OR entity_id = $2)
       ORDER BY occurred_at DESC
       LIMIT $3`,
      [options.workspaceId ?? null, options.entityId ?? null, options.limit ?? 500],
    );
    return result.rows;
  }
}
