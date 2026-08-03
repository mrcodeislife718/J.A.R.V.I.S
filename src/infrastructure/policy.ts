import type {
  InfrastructureActionKind,
  InfrastructureAlertSeverity,
  InfrastructureMetricSample,
  InfrastructureNode,
  InfrastructureRisk,
} from "./types.js";

export interface InfrastructureThresholds {
  cpuWarning: number;
  cpuCritical: number;
  memoryWarning: number;
  memoryCritical: number;
  diskWarning: number;
  diskCritical: number;
  staleAfterMs: number;
  backupStaleAfterMs: number;
}

export const DEFAULT_INFRASTRUCTURE_THRESHOLDS: InfrastructureThresholds = {
  cpuWarning: 0.85,
  cpuCritical: 0.95,
  memoryWarning: 0.85,
  memoryCritical: 0.95,
  diskWarning: 0.85,
  diskCritical: 0.95,
  staleAfterMs: 90_000,
  backupStaleAfterMs: 7 * 24 * 60 * 60 * 1_000,
};

export interface ThresholdEvaluation {
  kind: "cpu-high" | "memory-high" | "disk-high";
  active: boolean;
  severity: InfrastructureAlertSeverity;
  ratio: number;
  threshold: number;
  summary: string;
}

const severityFor = (
  ratio: number,
  warning: number,
  critical: number,
): { active: boolean; severity: InfrastructureAlertSeverity; threshold: number } => {
  if (ratio >= critical) return { active: true, severity: "critical", threshold: critical };
  if (ratio >= warning) return { active: true, severity: "warning", threshold: warning };
  return { active: false, severity: "info", threshold: warning };
};

export const evaluateMetricThresholds = (
  node: InfrastructureNode,
  metric: InfrastructureMetricSample,
  thresholds: InfrastructureThresholds,
): ThresholdEvaluation[] => {
  const memoryRatio = node.capacity.memoryTotalBytes > 0
    ? metric.memoryUsedBytes / node.capacity.memoryTotalBytes
    : 0;
  const diskRatio = node.capacity.diskTotalBytes > 0
    ? metric.diskUsedBytes / node.capacity.diskTotalBytes
    : 0;
  const cpu = severityFor(metric.cpuUtilization, thresholds.cpuWarning, thresholds.cpuCritical);
  const memory = severityFor(memoryRatio, thresholds.memoryWarning, thresholds.memoryCritical);
  const disk = severityFor(diskRatio, thresholds.diskWarning, thresholds.diskCritical);

  return [
    {
      kind: "cpu-high",
      active: cpu.active,
      severity: cpu.severity,
      ratio: metric.cpuUtilization,
      threshold: cpu.threshold,
      summary: `CPU utilization is ${(metric.cpuUtilization * 100).toFixed(1)}% on ${node.name}`,
    },
    {
      kind: "memory-high",
      active: memory.active,
      severity: memory.severity,
      ratio: memoryRatio,
      threshold: memory.threshold,
      summary: `Memory utilization is ${(memoryRatio * 100).toFixed(1)}% on ${node.name}`,
    },
    {
      kind: "disk-high",
      active: disk.active,
      severity: disk.severity,
      ratio: diskRatio,
      threshold: disk.threshold,
      summary: `Disk utilization is ${(diskRatio * 100).toFixed(1)}% on ${node.name}`,
    },
  ];
};

export const actionRisk = (kind: InfrastructureActionKind): InfrastructureRisk => {
  switch (kind) {
    case "health-check":
    case "verify-backup":
      return "low";
    case "drain-node":
    case "resume-node":
    case "rotate-logs":
      return "moderate";
    case "restart-service":
      return "high";
  }
};

export const actionRequiresPrivilegedExecutor = (kind: InfrastructureActionKind): boolean =>
  kind === "restart-service" || kind === "rotate-logs";

export const isNodeStale = (
  node: InfrastructureNode,
  nowMs: number,
  staleAfterMs: number,
): boolean => nowMs - new Date(node.lastSeenAt).getTime() > staleAfterMs;
