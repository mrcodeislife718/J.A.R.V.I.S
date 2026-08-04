import type { BusinessRepository } from "./repository.js";
import type { BusinessEntity, BusinessEntityType, BusinessEvent } from "./types.js";

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryBusinessRepository implements BusinessRepository {
  private readonly entities = new Map<string, BusinessEntity>();
  private readonly events = new Map<string, BusinessEvent>();

  async save(entity: BusinessEntity): Promise<void> {
    this.entities.set(`${entity.entityType}:${entity.id}`, clone(entity));
  }

  async get(type: BusinessEntityType, id: string): Promise<BusinessEntity | null> {
    const entity = this.entities.get(`${type}:${id}`);
    return entity ? clone(entity) : null;
  }

  async list(
    type: BusinessEntityType,
    options: { organizationId?: string | undefined; limit?: number | undefined } = {},
  ): Promise<BusinessEntity[]> {
    return [...this.entities.values()]
      .filter((entity) => entity.entityType === type)
      .filter((entity) => !options.organizationId || entity.organizationId === options.organizationId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, options.limit ?? 500)
      .map(clone);
  }

  async appendEvent(event: BusinessEvent): Promise<void> {
    this.events.set(event.id, clone(event));
  }

  async listEvents(
    options: { organizationId?: string | undefined; entityId?: string | undefined; limit?: number | undefined } = {},
  ): Promise<BusinessEvent[]> {
    return [...this.events.values()]
      .filter((event) => !options.organizationId || event.organizationId === options.organizationId)
      .filter((event) => !options.entityId || event.entityId === options.entityId)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, options.limit ?? 500)
      .map(clone);
  }
}
