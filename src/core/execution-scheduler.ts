import { randomUUID } from "node:crypto";
import { getCapability } from "../capabilities/registry.js";
import { getDomainManifest } from "../domains/registry.js";
import type { AuditRepository } from "../storage/in-memory.js";
import type { ContextPacket, MissionRecord, ModelClient } from "./types.js";
import { ModelRouter } from "./model-router.js";

export class ExecutionScheduler {
  constructor(
    private readonly modelClient: ModelClient,
    private readonly modelRouter: ModelRouter,
    private readonly auditRepository: AuditRepository,
    private readonly timeoutMs: number,
  ) {}

  async execute(record: MissionRecord, context: ContextPacket): Promise<MissionRecord> {
    const mission = structuredClone(record);
    mission.status = "running";
    mission.updatedAt = new Date().toISOString();

    for (const step of mission.steps) {
      if (step.status === "completed") continue;

      const dependenciesComplete = step.dependsOn.every((id) =>
        mission.steps.some((candidate) => candidate.id === id && candidate.status === "completed"),
      );
      if (!dependenciesComplete) {
        step.status = "skipped";
        step.error = "Dependency did not complete";
        mission.status = "failed";
        mission.error = `Step ${step.id} was blocked by an incomplete dependency`;
        break;
      }

      const capability = getCapability(step.capabilityId);
      const manifest = getDomainManifest(mission.request.domain);
      const route = this.modelRouter.route(mission, step.capabilityId);
      const priorOutputs = mission.steps
        .filter((candidate) => candidate.status === "completed" && candidate.output)
        .slice(-3)
        .map((candidate) => `${candidate.capabilityId}: ${candidate.output?.slice(0, 3_000)}`);

      step.status = "running";
      step.attempt += 1;
      step.startedAt = new Date().toISOString();
      await this.auditRepository.append({
        id: randomUUID(),
        missionId: mission.id,
        type: "capability.started",
        actor: "execution-scheduler",
        occurredAt: step.startedAt,
        detail: {
          stepId: step.id,
          capabilityId: step.capabilityId,
          model: route.model,
          routeReason: route.reason,
        },
      });

      const system = [
        "You are a bounded capability inside J.A.R.V.I.S, a governed AI operating system.",
        `Your only capability is: ${capability.name} — ${capability.description}`,
        `Domain: ${manifest.name}`,
        "Never claim that a source, tool, test, database, or external action was used unless it is explicitly present in the context.",
        "Do not perform or instruct irreversible side effects.",
        "Separate known evidence, inference, assumptions, contradictions, and missing information.",
        "Keep the response focused on the current capability and hand back a useful structured artifact.",
        `Safeguards: ${manifest.safeguards.join("; ")}`,
        `Denied actions: ${manifest.deniedActions.join("; ")}`,
      ].join("\n");

      const prompt = [
        `MISSION ID: ${mission.id}`,
        `OBJECTIVE: ${context.objective}`,
        `CURRENT CAPABILITY: ${step.capabilityId}`,
        `TOKEN BUDGET FOR THIS STEP: ${route.maxTokens}`,
        `SIDE EFFECTS ALLOWED: ${context.constraints.allowSideEffects}`,
        "WORKING STATE:",
        context.workingState.length > 0 ? context.workingState.join("\n") : "No approved prior state supplied.",
        "EVIDENCE REFERENCES:",
        context.evidence.length > 0 ? JSON.stringify(context.evidence) : "No source evidence supplied. Do not invent citations.",
        "PRIOR STEP OUTPUTS:",
        priorOutputs.length > 0 ? priorOutputs.join("\n\n") : "None.",
        "Return the result for this capability. For core.report, integrate the mission into a final answer and retain uncertainty labels.",
      ].join("\n\n");

      try {
        const response = await this.modelClient.generate({
          model: route.model,
          system,
          prompt,
          temperature: route.temperature,
          maxTokens: route.maxTokens,
          timeoutMs: Math.min(this.timeoutMs, mission.constraints.deadlineMs),
        });

        if (response.text.length === 0) {
          throw new Error("Model returned an empty result");
        }

        step.output = response.text;
        step.status = "completed";
        step.completedAt = new Date().toISOString();
        await this.auditRepository.append({
          id: randomUUID(),
          missionId: mission.id,
          type: "capability.completed",
          actor: "execution-scheduler",
          occurredAt: step.completedAt,
          detail: {
            stepId: step.id,
            capabilityId: step.capabilityId,
            model: response.model,
            inputTokens: response.inputTokens ?? null,
            outputTokens: response.outputTokens ?? null,
            totalDurationMs: response.totalDurationMs ?? null,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown execution failure";
        step.status = "failed";
        step.error = message;
        step.completedAt = new Date().toISOString();
        mission.status = "failed";
        mission.error = message;
        await this.auditRepository.append({
          id: randomUUID(),
          missionId: mission.id,
          type: "capability.failed",
          actor: "execution-scheduler",
          occurredAt: step.completedAt,
          detail: { stepId: step.id, capabilityId: step.capabilityId, error: message },
        });
        break;
      }
    }

    const reportStep = mission.steps.find((step) => step.capabilityId === "core.report");
    if (reportStep?.status === "completed" && reportStep.output) {
      mission.finalOutput = reportStep.output;
    }
    mission.updatedAt = new Date().toISOString();
    return mission;
  }
}
