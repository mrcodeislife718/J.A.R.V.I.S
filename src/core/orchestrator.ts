import { randomUUID } from "node:crypto";
import type { AuditRepository, MemoryRepository, MissionRepository } from "../storage/in-memory.js";
import { ContextCompiler } from "./context-compiler.js";
import { ExecutionScheduler } from "./execution-scheduler.js";
import { MemoryGate } from "./memory-gate.js";
import { MissionCompiler } from "./mission-compiler.js";
import type { AuditEvent, MemoryRecord, MissionAuthorization, MissionRecord, MissionRequest } from "./types.js";
import { VerificationEngine } from "./verification-engine.js";

export class JarvisOrchestrator {
  constructor(
    private readonly compiler: MissionCompiler,
    private readonly contextCompiler: ContextCompiler,
    private readonly scheduler: ExecutionScheduler,
    private readonly verifier: VerificationEngine,
    private readonly memoryGate: MemoryGate,
    private readonly missionRepository: MissionRepository,
    private readonly memoryRepository: MemoryRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async submit(request: MissionRequest): Promise<MissionRecord> {
    const mission = this.compiler.compile(request);
    await this.audit(mission.id, "mission.compiled", "mission-compiler", {
      domain: mission.request.domain,
      risk: mission.risk,
      capabilities: mission.request.requestedCapabilities,
    });

    if (mission.risk.prohibited) {
      mission.status = "failed";
      mission.error = "Mission rejected because it violates the selected domain policy";
      mission.updatedAt = new Date().toISOString();
      await this.missionRepository.save(mission);
      await this.audit(mission.id, "mission.rejected", "risk-engine", {
        reasons: mission.risk.reasons,
      });
      return mission;
    }

    await this.missionRepository.save(mission);
    if (mission.risk.requiresHumanAuthorization) {
      await this.audit(mission.id, "mission.awaiting-authorization", "risk-engine", {
        riskLevel: mission.risk.level,
        reasons: mission.risk.reasons,
      });
      return mission;
    }

    return this.run(mission);
  }

  async authorizeAndRun(id: string, authorization: MissionAuthorization): Promise<MissionRecord> {
    const mission = await this.requireMission(id);
    if (mission.risk.prohibited) throw new Error("A prohibited mission cannot be authorized");
    if (mission.status !== "awaiting-authorization") {
      throw new Error(`Mission ${id} is not awaiting authorization`);
    }

    mission.authorization = authorization;
    mission.status = "compiled";
    mission.updatedAt = new Date().toISOString();
    await this.missionRepository.save(mission);
    await this.audit(mission.id, "mission.authorized", authorization.approvedBy, {
      scope: authorization.scope,
      approvedAt: authorization.approvedAt,
    });
    return this.run(mission);
  }

  async getMission(id: string): Promise<MissionRecord | null> {
    return this.missionRepository.get(id);
  }

  async listMissions(): Promise<MissionRecord[]> {
    return this.missionRepository.list();
  }

  async listMemories(status?: MemoryRecord["status"]): Promise<MemoryRecord[]> {
    return this.memoryRepository.list(status);
  }

  async approveMemory(id: string, reviewedBy: string): Promise<MemoryRecord> {
    const memory = await this.memoryGate.approve(id, reviewedBy);
    await this.audit(memory.missionId, "memory.approved", reviewedBy, { memoryId: memory.id });
    return memory;
  }

  async rejectMemory(id: string, reviewedBy: string, reason: string): Promise<MemoryRecord> {
    const memory = await this.memoryGate.reject(id, reviewedBy, reason);
    await this.audit(memory.missionId, "memory.rejected", reviewedBy, { memoryId: memory.id, reason });
    return memory;
  }

  async listAudit(missionId: string): Promise<AuditEvent[]> {
    return this.auditRepository.listForMission(missionId);
  }

  private async run(record: MissionRecord): Promise<MissionRecord> {
    const context = await this.contextCompiler.compile(record);
    let mission = await this.scheduler.execute(record, context);

    if (mission.status === "failed") {
      await this.missionRepository.save(mission);
      return mission;
    }

    mission.verification = this.verifier.verify(mission, context);
    mission.status = mission.verification.passed ? "completed" : "verification-failed";
    mission.updatedAt = new Date().toISOString();
    await this.missionRepository.save(mission);
    await this.audit(mission.id, "mission.verified", "verification-engine", {
      passed: mission.verification.passed,
      checks: mission.verification.checks,
    });

    const candidate = await this.memoryGate.createCandidate(mission, context);
    if (candidate) {
      await this.audit(mission.id, "memory.candidate-created", "memory-gate", {
        memoryId: candidate.id,
        confidence: candidate.confidence,
      });
    }
    return mission;
  }

  private async requireMission(id: string): Promise<MissionRecord> {
    const mission = await this.missionRepository.get(id);
    if (!mission) throw new Error(`Mission ${id} was not found`);
    return mission;
  }

  private async audit(
    missionId: string,
    type: string,
    actor: string,
    detail: Record<string, unknown>,
  ): Promise<void> {
    await this.auditRepository.append({
      id: randomUUID(),
      missionId,
      type,
      actor,
      occurredAt: new Date().toISOString(),
      detail,
    });
  }
}
