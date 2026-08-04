import type { Pool } from "pg";
import type { ContentRepository } from "./repository.js";
import type { ContentEntity, ContentEntityType, ContentEvent } from "./types.js";

export class PostgresContentRepository implements ContentRepository {
  constructor(private readonly pool: Pool) {}

  async save(entity: ContentEntity): Promise<void> {
    await this.pool.query(
      `INSERT INTO content_entities (entity_type, id, brand_id, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       ON CONFLICT (entity_type, id) DO UPDATE SET
         brand_id = EXCLUDED.brand_id,
         body = EXCLUDED.body,
         updated_at = EXCLUDED.updated_at`,
      [entity.entityType, entity.id, entity.brandId, JSON.stringify(entity), entity.createdAt, entity.updatedAt],
    );
  }

  async get(type: ContentEntityType, id: string): Promise<ContentEntity | null> {
    const result = await this.pool.query<{ body: ContentEntity }>(
      `SELECT body FROM content_entities WHERE entity_type = $1 AND id = $2`,
      [type, id],
    );
    return result.rows[0]?.body ?? null;
  }

  async list(
    type: ContentEntityType,
    options: { brandId?: string | undefined; limit?: number | undefined } = {},
  ): Promise<ContentEntity[]> {
    const result = await this.pool.query<{ body: ContentEntity }>(
      `SELECT body
         FROM content_entities
        WHERE entity_type = $1
          AND ($2::text IS NULL OR brand_id = $2)
        ORDER BY updated_at DESC
        LIMIT $3`,
      [type, options.brandId ?? null, options.limit ?? 500],
    );
    return result.rows.map((row) => row.body);
  }

  async appendEvent(event: ContentEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO content_events (
         id, brand_id, entity_type, entity_id, type, actor, summary, occurred_at, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [
        event.id,
        event.brandId,
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
    options: { brandId?: string | undefined; entityId?: string | undefined; limit?: number | undefined } = {},
  ): Promise<ContentEvent[]> {
    const result = await this.pool.query<ContentEvent>(
      `SELECT
         id, brand_id AS "brandId", entity_type AS "entityType",
         entity_id AS "entityId", type, actor, summary,
         occurred_at::text AS "occurredAt", metadata
       FROM content_events
       WHERE ($1::text IS NULL OR brand_id = $1)
         AND ($2::text IS NULL OR entity_id = $2)
       ORDER BY occurred_at DESC
       LIMIT $3`,
      [options.brandId ?? null, options.entityId ?? null, options.limit ?? 500],
    );
    return result.rows;
  }
}
