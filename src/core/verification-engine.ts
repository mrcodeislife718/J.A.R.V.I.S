import type { ContextPacket, MissionRecord, VerificationCheck, VerificationReport } from "./types.js";

export class VerificationEngine {
  verify(mission: MissionRecord, context: ContextPacket): VerificationReport {
    const checks: VerificationCheck[] = [];
    const add = (id: string, passed: boolean, detail: string): void => {
      checks.push({ id, passed, detail });
    };

    add(
      "mission-not-prohibited",
      !mission.risk.prohibited,
      mission.risk.prohibited ? "Domain policy marked the mission as prohibited" : "No prohibited action detected",
    );

    add(
      "authorization-present",
      !mission.risk.requiresHumanAuthorization || mission.authorization !== undefined,
      mission.risk.requiresHumanAuthorization
        ? mission.authorization
          ? `Authorized by ${mission.authorization.approvedBy}`
          : "Human authorization is required but missing"
        : "Human authorization is not required for this mission",
    );

    const incomplete = mission.steps.filter((step) => step.status !== "completed");
    add(
      "capability-graph-complete",
      incomplete.length === 0,
      incomplete.length === 0
        ? "Every planned capability completed"
        : `Incomplete steps: ${incomplete.map((step) => `${step.capabilityId}:${step.status}`).join(", ")}`,
    );

    add(
      "final-output-present",
      Boolean(mission.finalOutput?.trim()),
      mission.finalOutput?.trim() ? "Final report is present" : "Final report is missing",
    );

    const evidenceInvented = context.evidence.length === 0 && /\b(citation|source \d+|doi:|pmid:)\b/i.test(mission.finalOutput ?? "");
    add(
      "evidence-integrity",
      !evidenceInvented,
      evidenceInvented
        ? "Output appears to cite evidence although no evidence references were supplied"
        : "No unsupported citation marker detected",
    );

    const biomedicalDosing =
      mission.request.domain === "biomedical-research" &&
      /\b(administer|take|inject|infuse)\b.{0,50}\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|ml|mL|g\/kg)\b/i.test(mission.finalOutput ?? "");
    add(
      "biomedical-human-use-boundary",
      !biomedicalDosing,
      biomedicalDosing
        ? "Output appears to contain actionable human dosing or administration instructions"
        : "No actionable human dosing instruction detected",
    );

    const sideEffectViolation = !mission.constraints.allowSideEffects && /\b(executed|deleted|deployed|published|transferred funds|changed firewall)\b/i.test(mission.finalOutput ?? "");
    add(
      "side-effect-boundary",
      !sideEffectViolation,
      sideEffectViolation ? "Output claims a side effect despite side effects being disabled" : "Side-effect boundary preserved",
    );

    return {
      passed: checks.every((check) => check.passed),
      checks,
      verifiedAt: new Date().toISOString(),
    };
  }
}
