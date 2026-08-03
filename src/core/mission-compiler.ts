import { randomUUID } from "node:crypto";
import { getCapability } from "../capabilities/registry.js";
import { getDomainManifest } from "../domains/registry.js";
import { assessRisk } from "./risk-engine.js";
import type { MissionConstraints, MissionRecord, MissionRequest, MissionStep } from "./types.js";

export interface MissionCompilerDefaults {
  tokenBudget: number;
  memoryBudgetMb: number;
  deadlineMs: number;
}

const deduplicate = <T>(items: T[]): T[] => [...new Set(items)];

export class MissionCompiler {
  constructor(private readonly defaults: MissionCompilerDefaults) {}

  compile(rawRequest: MissionRequest): MissionRecord {
    const manifest = getDomainManifest(rawRequest.domain);
    const selected = rawRequest.requestedCapabilities.length > 0
      ? rawRequest.requestedCapabilities
      : manifest.defaultCapabilities;

    for (const capabilityId of selected) {
      getCapability(capabilityId);
      if (!manifest.allowedCapabilities.includes(capabilityId)) {
        throw new Error(`Capability ${capabilityId} is not allowed in ${manifest.id}`);
      }
    }

    const requestedCapabilities = deduplicate(selected);
    const constraints: MissionConstraints = {
      tokenBudget: rawRequest.constraints.tokenBudget ?? this.defaults.tokenBudget,
      memoryBudgetMb: rawRequest.constraints.memoryBudgetMb ?? this.defaults.memoryBudgetMb,
      deadlineMs: rawRequest.constraints.deadlineMs ?? this.defaults.deadlineMs,
      allowExternalNetwork: rawRequest.constraints.allowExternalNetwork ?? false,
      allowSideEffects: rawRequest.constraints.allowSideEffects ?? false,
    };

    if (constraints.tokenBudget < 512) throw new Error("Token budget must be at least 512");
    if (constraints.memoryBudgetMb < 256) throw new Error("Memory budget must be at least 256 MB");
    if (constraints.deadlineMs < 1_000) throw new Error("Deadline must be at least 1000 ms");

    const request: MissionRequest = {
      ...rawRequest,
      requestedCapabilities,
      constraints,
    };

    const capabilityGraph = deduplicate([
      "core.plan",
      "core.retrieve",
      ...requestedCapabilities,
      "core.verify",
      "core.report",
    ]);

    let previousStepId: string | undefined;
    const steps: MissionStep[] = capabilityGraph.map((capabilityId, index) => {
      const id = `step-${index + 1}-${randomUUID().slice(0, 8)}`;
      const dependsOn = previousStepId ? [previousStepId] : [];
      previousStepId = id;
      return {
        id,
        capabilityId,
        dependsOn,
        status: "pending",
        attempt: 0,
      };
    });

    const now = new Date().toISOString();
    const risk = assessRisk(request);

    return {
      id: randomUUID(),
      request,
      status: risk.prohibited || risk.requiresHumanAuthorization ? "awaiting-authorization" : "compiled",
      risk,
      constraints,
      steps,
      createdAt: now,
      updatedAt: now,
    };
  }
}
