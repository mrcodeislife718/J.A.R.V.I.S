import type { ContentRepository } from "./repository.js";
import type { ContentEntity, ContentEntityType, ContentEvent } from "./types.js";

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryContentRepository implements ContentRepository {
  private readonly entities = new Map<string, ContentEntity>();
  private readonly events = new Map<string, ContentEvent>();

  async save(entity: ContentEntity): Promise<void> {
    this.entities.set(`${entity.entityType}:${entity.id}`, clone(entity));
  }

  async get(type: ContentEntityType, id: string): Promise<ContentEntity | null> {
    const entity = this.entities.get(`${type}:${id}`);
    return entity ? clone(entity) : null;
  }

  async list(
    type: ContentEntityType,
    options: { brandId?: string | undefined; limit?: number | undefined } = {},
  ): Promise<ContentEntity[]> {
    return [...this.entities.values()]
      .filter((entity) => entity.entityType === type)
      .filter((entity) => !options.brandId || entity.brandId === options.brandId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, options.limit ?? 500)
      .map(clone);
  }

  async appendEvent(event: ContentEvent): Promise<void> {
    this.events.set(event.id, clone(event));
  }

  async listEvents(
    options: { brandId?: string | undefined; entityId?: string | undefined; limit?: number | undefined } = {},
  ): Promise<ContentEvent[]> {
    return [...this.events.values()]
      .filter((event) => !options.brandId || event.brandId === options.brandId)
      .filter((event) => !options.entityId || event.entityId === options.entityId)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, options.limit ?? 500)
      .map(clone);
  }
}
