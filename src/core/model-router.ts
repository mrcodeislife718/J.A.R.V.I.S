import { getCapability } from "../capabilities/registry.js";
import type { MissionRecord } from "./types.js";

export interface ModelRouterConfig {
  defaultModel: string;
  strongModel: string;
}

export interface ModelRoute {
  model: string;
  reason: string;
  maxTokens: number;
  temperature: number;
}

export class ModelRouter {
  constructor(private readonly config: ModelRouterConfig) {}

  route(mission: MissionRecord, capabilityId: string): ModelRoute {
    const capability = getCapability(capabilityId);
    const objectiveLength = mission.request.objective.length;
    const needsStrongModel =
      mission.risk.level === "high" ||
      mission.risk.level === "critical" ||
      capability.risk === "high" ||
      capability.risk === "critical" ||
      objectiveLength > 2_000 ||
      capabilityId === "core.verify";

    const remainingSteps = Math.max(1, mission.steps.filter((step) => step.status !== "completed").length);
    const perStepBudget = Math.max(256, Math.floor(mission.constraints.tokenBudget / remainingSteps));

    return {
      model: needsStrongModel ? this.config.strongModel : this.config.defaultModel,
      reason: needsStrongModel ? "Elevated risk or reasoning requirement" : "Routine bounded capability",
      maxTokens: Math.min(perStepBudget, 4_096),
      temperature: capabilityId === "content.draft" ? 0.45 : 0.15,
    };
  }
}
