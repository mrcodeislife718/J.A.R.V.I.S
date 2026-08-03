import { randomUUID } from "node:crypto";
import { getDomainManifest } from "../domains/registry.js";
import type { MemoryRepository } from "../storage/in-memory.js";
import type { ContextPacket, MemoryRecord, MissionRecord } from "./types.js";

export class MemoryGate {
  constructor(private readonly memoryRepository: MemoryRepository) {}

  async createCandidate(mission: MissionRecord, context: ContextPacket): Promise<MemoryRecord | null> {
    if (!mission.request.rememberOutput || !mission.verification?.passed || !mission.finalOutput) {
      return null;
    }

    const manifest = getDomainManifest(mission.request.domain);
    const provenance = context.evidence;
    const candidate: MemoryRecord = {
      id: randomUUID(),
      domain: mission.request.domain,
      namespace: manifest.memoryNamespace,
      missionId: mission.id,
      content: mission.finalOutput,
      status: "candidate",
      confidence: provenance.length > 0 ? 0.8 : 0.6,
      provenance,
      createdAt: new Date().toISOString(),
    };
    await this.memoryRepository.save(candidate);
    return candidate;
  }

  async approve(id: string, reviewedBy: string): Promise<MemoryRecord> {
    const record = await this.memoryRepository.get(id);
    if (!record) throw new Error(`Memory candidate ${id} was not found`);
    if (record.status !== "candidate") throw new Error(`Memory ${id} is not awaiting review`);

    record.status = "approved";
    record.reviewedAt = new Date().toISOString();
    record.reviewedBy = reviewedBy;
    await this.memoryRepository.save(record);
    return record;
  }

  async reject(id: string, reviewedBy: string, reason: string): Promise<MemoryRecord> {
    const record = await this.memoryRepository.get(id);
    if (!record) throw new Error(`Memory candidate ${id} was not found`);
    if (record.status !== "candidate") throw new Error(`Memory ${id} is not awaiting review`);

    record.status = "rejected";
    record.reviewedAt = new Date().toISOString();
    record.reviewedBy = reviewedBy;
    record.rejectionReason = reason;
    await this.memoryRepository.save(record);
    return record;
  }
}
