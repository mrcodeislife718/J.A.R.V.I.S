import { isNodeStale } from "./policy.js";
import type {
  InfrastructureNodeView,
  InfrastructureSchedulingDecision,
  InfrastructureWorkloadRequest,
} from "./types.js";

const clamp = (value: number, minimum = 0, maximum = 1): number =>
  Math.min(maximum, Math.max(minimum, value));

export class InfrastructureScheduler {
  constructor(private readonly staleAfterMs: number) {}

  decide(
    request: InfrastructureWorkloadRequest,
    nodes: InfrastructureNodeView[],
    now = new Date(),
  ): InfrastructureSchedulingDecision {
    const nowMs = now.getTime();
    const candidates = nodes.map((view) => {
      const reasons: string[] = [];
      const metric = view.latestMetric;
      const node = view.node;
      const stale = isNodeStale(node, nowMs, this.staleAfterMs);
      const effectiveStatus = stale ? "offline" : view.effectiveStatus;
      const missingCapabilities = request.requiredCapabilities.filter(
        (capability) => !node.capabilities.includes(capability),
      );
      const freeMemory = Math.max(
        0,
        node.capacity.memoryTotalBytes - (metric?.memoryUsedBytes ?? 0),
      );
      const freeDisk = Math.max(
        0,
        node.capacity.diskTotalBytes - (metric?.diskUsedBytes ?? 0),
      );
      const gpuMemory = node.capacity.gpuMemoryTotalBytes ?? 0;

      if (effectiveStatus === "offline") reasons.push("node is offline or stale");
      if (effectiveStatus === "maintenance") reasons.push("node is in maintenance mode");
      if (effectiveStatus === "degraded" && !request.allowDegraded) {
        reasons.push("node is degraded and degraded scheduling is disabled");
      }
      if (node.capacity.cpuCores < request.minimumCpuCores) {
        reasons.push(`requires ${request.minimumCpuCores} CPU cores`);
      }
      if (freeMemory < request.minimumFreeMemoryBytes) {
        reasons.push(`requires ${request.minimumFreeMemoryBytes} free memory bytes`);
      }
      if (freeDisk < request.minimumFreeDiskBytes) {
        reasons.push(`requires ${request.minimumFreeDiskBytes} free disk bytes`);
      }
      if (gpuMemory < request.minimumGpuMemoryBytes) {
        reasons.push(`requires ${request.minimumGpuMemoryBytes} GPU memory bytes`);
      }
      if (missingCapabilities.length > 0) {
        reasons.push(`missing capabilities: ${missingCapabilities.join(", ")}`);
      }

      const accepted = reasons.length === 0;
      const cpuHeadroom = clamp(1 - (metric?.cpuUtilization ?? 0));
      const memoryHeadroom = node.capacity.memoryTotalBytes > 0
        ? clamp(freeMemory / node.capacity.memoryTotalBytes)
        : 0;
      const diskHeadroom = node.capacity.diskTotalBytes > 0
        ? clamp(freeDisk / node.capacity.diskTotalBytes)
        : 0;
      const labelMatch = request.preferredLabels.length === 0
        ? 1
        : request.preferredLabels.filter((label) => node.labels.includes(label)).length /
          request.preferredLabels.length;
      const serviceHealth = view.services.length === 0
        ? 0.5
        : view.services.filter((service) => service.status === "healthy").length / view.services.length;
      const alertPenalty = Math.min(0.5, view.openAlerts.length * 0.1);
      const degradedPenalty = effectiveStatus === "degraded" ? 0.2 : 0;
      const score = accepted
        ? Number(
            (
              cpuHeadroom * 0.25 +
              memoryHeadroom * 0.35 +
              diskHeadroom * 0.1 +
              labelMatch * 0.15 +
              serviceHealth * 0.15 -
              alertPenalty -
              degradedPenalty
            ).toFixed(6),
          )
        : 0;

      if (accepted) {
        reasons.push(
          `accepted with CPU ${(cpuHeadroom * 100).toFixed(1)}%, memory ${(memoryHeadroom * 100).toFixed(1)}%, and disk ${(diskHeadroom * 100).toFixed(1)}% headroom`,
        );
      }

      return { nodeId: node.id, accepted, score, reasons };
    });

    const selected = candidates
      .filter((candidate) => candidate.accepted)
      .sort((a, b) => b.score - a.score || a.nodeId.localeCompare(b.nodeId))[0];

    return {
      workloadId: request.workloadId,
      selectedNodeId: selected?.nodeId ?? null,
      candidates,
      decidedAt: now.toISOString(),
    };
  }
}
