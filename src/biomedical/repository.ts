import type { BiomedicalEntity, BiomedicalEntityType, BiomedicalEvent } from "./types.js";

export interface BiomedicalRepository {
  save(entity: BiomedicalEntity): Promise<void>;
  get(type: BiomedicalEntityType, id: string): Promise<BiomedicalEntity | null>;
  list(type: BiomedicalEntityType, options?: { workspaceId?: string | undefined; limit?: number | undefined }): Promise<BiomedicalEntity[]>;
  appendEvent(event: BiomedicalEvent): Promise<void>;
  listEvents(options?: { workspaceId?: string | undefined; entityId?: string | undefined; limit?: number | undefined }): Promise<BiomedicalEvent[]>;
}
