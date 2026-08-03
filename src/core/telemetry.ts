import type { AuditRepository, MissionRepository } from "../storage/in-memory.js";

export interface TelemetrySnapshot {
  generatedAt: string;
  missions: {
    total: number;
    completed: number;
    awaitingAuthorization: number;
    failed: number;
    verificationFailed: number;
    completionRate: number;
  };
  inference: {
    completedCalls: number;
    failedCalls: number;
    inputTokens: number;
    outputTokens: number;
    totalDurationMs: number;
    averageDurationMs: number;
    estimatedApiCostUsd: number;
  };
}

const numericDetail = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export class TelemetryService {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async snapshot(): Promise<TelemetrySnapshot> {
    const [missions, events] = await Promise.all([
      this.missionRepository.list(),
      this.auditRepository.listAll(),
    ]);
    const completedCalls = events.filter((event) => event.type === "capability.completed");
    const failedCalls = events.filter((event) => event.type === "capability.failed");
    const inputTokens = completedCalls.reduce((sum, event) => sum + numericDetail(event.detail.inputTokens), 0);
    const outputTokens = completedCalls.reduce((sum, event) => sum + numericDetail(event.detail.outputTokens), 0);
    const totalDurationMs = completedCalls.reduce((sum, event) => sum + numericDetail(event.detail.totalDurationMs), 0);
    const completed = missions.filter((mission) => mission.status === "completed").length;

    return {
      generatedAt: new Date().toISOString(),
      missions: {
        total: missions.length,
        completed,
        awaitingAuthorization: missions.filter((mission) => mission.status === "awaiting-authorization").length,
        failed: missions.filter((mission) => mission.status === "failed").length,
        verificationFailed: missions.filter((mission) => mission.status === "verification-failed").length,
        completionRate: missions.length > 0 ? completed / missions.length : 0,
      },
      inference: {
        completedCalls: completedCalls.length,
        failedCalls: failedCalls.length,
        inputTokens,
        outputTokens,
        totalDurationMs,
        averageDurationMs: completedCalls.length > 0 ? totalDurationMs / completedCalls.length : 0,
        estimatedApiCostUsd: 0,
      },
    };
  }
}
