import type { BiomedicalRepository } from "./repository.js";
import type { BiomedicalEntity, BiomedicalEntityType, BiomedicalEvent } from "./types.js";

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryBiomedicalRepository implements BiomedicalRepository {
  private readonly entities = new Map<string, BiomedicalEntity>();
  private readonly events = new Map<string, BiomedicalEvent>();

  async save(entity: BiomedicalEntity): Promise<void> {
    this.entities.set(`${entity.entityType}:${entity.id}`, clone(entity));
  }

  async get(type: BiomedicalEntityType, id: string): Promise<BiomedicalEntity | null> {
    const entity = this.entities.get(`${type}:${id}`);
    return entity ? clone(entity) : null;
  }

  async list(type: BiomedicalEntityType, options: { workspaceId?: string | undefined; limit?: number | undefined } = {}): Promise<BiomedicalEntity[]> {
    return [...this.entities.values()]
      .filter((entity) => entity.entityType === type)
      .filter((entity) => !options.workspaceId || entity.workspaceId === options.workspaceId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, options.limit ?? 500)
      .map(clone);
  }

  async appendEvent(event: BiomedicalEvent): Promise<void> {
    this.events.set(event.id, clone(event));
  }

  async listEvents(options: { workspaceId?: string | undefined; entityId?: string | undefined; limit?: number | undefined } = {}): Promise<BiomedicalEvent[]> {
    return [...this.events.values()]
      .filter((event) => !options.workspaceId || event.workspaceId === options.workspaceId)
      .filter((event) => !options.entityId || event.entityId === options.entityId)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, options.limit ?? 500)
      .map(clone);
  }
}
