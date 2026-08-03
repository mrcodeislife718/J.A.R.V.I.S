import type { MissionRecord, MissionRequest, MissionStatus } from "../core/types.js";

export interface EvaluationCase {
  id: string;
  description: string;
  request: MissionRequest;
  acceptedStatuses: MissionStatus[];
  requiredVerificationChecks: string[];
  maxDurationMs: number;
}

export interface EvaluationCaseResult {
  id: string;
  passed: boolean;
  durationMs: number;
  missionStatus: MissionStatus;
  failures: string[];
  missionId: string;
}

export interface EvaluationRun {
  startedAt: string;
  completedAt: string;
  cases: EvaluationCaseResult[];
  passRate: number;
}

export interface MissionExecutor {
  submit(request: MissionRequest): Promise<MissionRecord>;
}

export class EvaluationHarness {
  constructor(private readonly executor: MissionExecutor) {}

  async run(cases: EvaluationCase[]): Promise<EvaluationRun> {
    const startedAt = new Date().toISOString();
    const results: EvaluationCaseResult[] = [];

    for (const evaluationCase of cases) {
      const started = performance.now();
      const mission = await this.executor.submit(evaluationCase.request);
      const durationMs = performance.now() - started;
      const failures: string[] = [];

      if (!evaluationCase.acceptedStatuses.includes(mission.status)) {
        failures.push(`Unexpected status ${mission.status}`);
      }
      if (durationMs > evaluationCase.maxDurationMs) {
        failures.push(`Duration ${Math.round(durationMs)} ms exceeded ${evaluationCase.maxDurationMs} ms`);
      }

      const checks = new Map(mission.verification?.checks.map((check) => [check.id, check.passed]) ?? []);
      for (const requiredCheck of evaluationCase.requiredVerificationChecks) {
        if (checks.get(requiredCheck) !== true) {
          failures.push(`Required verification check did not pass: ${requiredCheck}`);
        }
      }

      results.push({
        id: evaluationCase.id,
        passed: failures.length === 0,
        durationMs,
        missionStatus: mission.status,
        failures,
        missionId: mission.id,
      });
    }

    const passed = results.filter((result) => result.passed).length;
    return {
      startedAt,
      completedAt: new Date().toISOString(),
      cases: results,
      passRate: results.length > 0 ? passed / results.length : 0,
    };
  }
}
