import type { SupportEntity, SupportEntityType, SupportEvent } from "./types.js";

export interface SupportRepository {
  save(entity: SupportEntity): Promise<void>;
  get(type: SupportEntityType, id: string): Promise<SupportEntity | null>;
  list(
    type: SupportEntityType,
    options?: { workspaceId?: string | undefined; limit?: number | undefined },
  ): Promise<SupportEntity[]>;
  appendEvent(event: SupportEvent): Promise<void>;
  listEvents(options?: {
    workspaceId?: string | undefined;
    entityId?: string | undefined;
    limit?: number | undefined;
  }): Promise<SupportEvent[]>;
}
