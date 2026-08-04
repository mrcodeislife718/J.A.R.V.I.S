import type { ContentEntity, ContentEntityType, ContentEvent } from "./types.js";

export interface ContentRepository {
  save(entity: ContentEntity): Promise<void>;
  get(type: ContentEntityType, id: string): Promise<ContentEntity | null>;
  list(type: ContentEntityType, options?: { brandId?: string | undefined; limit?: number | undefined }): Promise<ContentEntity[]>;
  appendEvent(event: ContentEvent): Promise<void>;
  listEvents(options?: {
    brandId?: string | undefined;
    entityId?: string | undefined;
    limit?: number | undefined;
  }): Promise<ContentEvent[]>;
}
