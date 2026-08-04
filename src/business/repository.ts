import type { BusinessEntity, BusinessEntityType, BusinessEvent } from "./types.js";

export interface BusinessRepository {
  save(entity: BusinessEntity): Promise<void>;
  get(type: BusinessEntityType, id: string): Promise<BusinessEntity | null>;
  list(type: BusinessEntityType, options?: { organizationId?: string | undefined; limit?: number | undefined }): Promise<BusinessEntity[]>;
  appendEvent(event: BusinessEvent): Promise<void>;
  listEvents(options?: {
    organizationId?: string | undefined;
    entityId?: string | undefined;
    limit?: number | undefined;
  }): Promise<BusinessEvent[]>;
}
