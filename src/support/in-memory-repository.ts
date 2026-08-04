import type { SupportRepository } from "./repository.js";
import type { SupportEntity, SupportEntityType, SupportEvent } from "./types.js";

const clone = <T>(value: T): T => structuredClone(value);

export class InMemorySupportRepository implements SupportRepository {
  private readonly entities = new Map<string, SupportEntity>();
  private readonly events = new Map<string, SupportEvent>();

  async save(entity: SupportEntity): Promise<void> {
    this.entities.set(`${entity.entityType}:${entity.id}`, clone(entity));
  }

  async get(type: SupportEntityType, id: string): Promise<SupportEntity | null> {
    const entity = this.entities.get(`${type}:${id}`);
    return entity ? clone(entity) : null;
  }

  async list(
    type: SupportEntityType,
    options: { workspaceId?: string | undefined; limit?: number | undefined } = {},
  ): Promise<SupportEntity[]> {
    return [...this.entities.values()]
      .filter((entity) => entity.entityType === type)
      .filter((entity) => !options.workspaceId || entity.workspaceId === options.workspaceId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, options.limit ?? 500)
      .map(clone);
  }

  async appendEvent(event: SupportEvent): Promise<void> {
    this.events.set(event.id, clone(event));
  }

  async listEvents(
    options: { workspaceId?: string | undefined; entityId?: string | undefined; limit?: number | undefined } = {},
  ): Promise<SupportEvent[]> {
    return [...this.events.values()]
      .filter((event) => !options.workspaceId || event.workspaceId === options.workspaceId)
      .filter((event) => !options.entityId || event.entityId === options.entityId)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, options.limit ?? 500)
      .map(clone);
  }
}
