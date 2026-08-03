import type { AuditEvent, MemoryRecord, MissionRecord } from "../core/types.js";

export interface MissionRepository {
  save(record: MissionRecord): Promise<void>;
  get(id: string): Promise<MissionRecord | null>;
  list(): Promise<MissionRecord[]>;
}

export interface MemoryRepository {
  save(record: MemoryRecord): Promise<void>;
  get(id: string): Promise<MemoryRecord | null>;
  list(status?: MemoryRecord["status"]): Promise<MemoryRecord[]>;
}

export interface AuditRepository {
  append(event: AuditEvent): Promise<void>;
  listForMission(missionId: string): Promise<AuditEvent[]>;
  listAll(): Promise<AuditEvent[]>;
}

export class InMemoryMissionRepository implements MissionRepository {
  private readonly records = new Map<string, MissionRecord>();

  async save(record: MissionRecord): Promise<void> {
    this.records.set(record.id, structuredClone(record));
  }

  async get(id: string): Promise<MissionRecord | null> {
    const record = this.records.get(id);
    return record ? structuredClone(record) : null;
  }

  async list(): Promise<MissionRecord[]> {
    return [...this.records.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((record) => structuredClone(record));
  }
}

export class InMemoryMemoryRepository implements MemoryRepository {
  private readonly records = new Map<string, MemoryRecord>();

  async save(record: MemoryRecord): Promise<void> {
    this.records.set(record.id, structuredClone(record));
  }

  async get(id: string): Promise<MemoryRecord | null> {
    const record = this.records.get(id);
    return record ? structuredClone(record) : null;
  }

  async list(status?: MemoryRecord["status"]): Promise<MemoryRecord[]> {
    const records = [...this.records.values()];
    return records
      .filter((record) => !status || record.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((record) => structuredClone(record));
  }
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    this.events.push(structuredClone(event));
  }

  async listForMission(missionId: string): Promise<AuditEvent[]> {
    return this.events
      .filter((event) => event.missionId === missionId)
      .map((event) => structuredClone(event));
  }

  async listAll(): Promise<AuditEvent[]> {
    return this.events.map((event) => structuredClone(event));
  }
}
