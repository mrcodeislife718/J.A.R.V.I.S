import type { Pool } from "pg";
import type { BusinessRepository } from "./repository.js";
import type { BusinessEntity, BusinessEntityType, BusinessEvent } from "./types.js";

export class PostgresBusinessRepository implements BusinessRepository {
  constructor(private readonly pool: Pool) {}

  async save(entity: BusinessEntity): Promise<void> {
    await this.pool.query(
      `INSERT INTO business_entities (entity_type, id, organization_id, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       ON CONFLICT (entity_type, id) DO UPDATE SET
         organization_id = EXCLUDED.organization_id,
         body = EXCLUDED.body,
         updated_at = EXCLUDED.updated_at`,
      [
        entity.entityType,
        entity.id,
        entity.organizationId,
        JSON.stringify(entity),
        entity.createdAt,
        entity.updatedAt,
      ],
    );
  }

  async get(type: BusinessEntityType, id: string): Promise<BusinessEntity | null> {
    const result = await this.pool.query<{ body: BusinessEntity }>(
      `SELECT body FROM business_entities WHERE entity_type = $1 AND id = $2`,
      [type, id],
    );
    return result.rows[0]?.body ?? null;
  }

  async list(
    type: BusinessEntityType,
    options: { organizationId?: string | undefined; limit?: number | undefined } = {},
  ): Promise<BusinessEntity[]> {
    const result = await this.pool.query<{ body: BusinessEntity }>(
      `SELECT body
         FROM business_entities
        WHERE entity_type = $1
          AND ($2::text IS NULL OR organization_id = $2)
        ORDER BY updated_at DESC
        LIMIT $3`,
      [type, options.organizationId ?? null, options.limit ?? 500],
    );
    return result.rows.map((row) => row.body);
  }

  async appendEvent(event: BusinessEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO business_events (
         id, organization_id, entity_type, entity_id, type, actor, summary, occurred_at, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [
        event.id,
        event.organizationId,
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
    options: { organizationId?: string | undefined; entityId?: string | undefined; limit?: number | undefined } = {},
  ): Promise<BusinessEvent[]> {
    const result = await this.pool.query<BusinessEvent>(
      `SELECT
         id, organization_id AS "organizationId", entity_type AS "entityType",
         entity_id AS "entityId", type, actor, summary,
         occurred_at::text AS "occurredAt", metadata
       FROM business_events
       WHERE ($1::text IS NULL OR organization_id = $1)
         AND ($2::text IS NULL OR entity_id = $2)
       ORDER BY occurred_at DESC
       LIMIT $3`,
      [options.organizationId ?? null, options.entityId ?? null, options.limit ?? 500],
    );
    return result.rows;
  }
}
