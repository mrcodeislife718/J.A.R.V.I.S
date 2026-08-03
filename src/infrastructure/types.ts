export const INFRASTRUCTURE_PLATFORMS = ["linux", "darwin", "win32", "unknown"] as const;
export const INFRASTRUCTURE_NODE_ROLES = ["controller", "worker", "storage", "database", "hybrid"] as const;
export const INFRASTRUCTURE_NODE_STATUSES = ["online", "degraded", "offline", "maintenance"] as const;
export const INFRASTRUCTURE_SERVICE_STATUSES = ["healthy", "degraded", "unavailable", "unknown"] as const;
export const INFRASTRUCTURE_ALERT_SEVERITIES = ["info", "warning", "critical"] as const;
export const INFRASTRUCTURE_ALERT_STATUSES = ["open", "resolved"] as const;
export const INFRASTRUCTURE_ACTION_KINDS = [
  "health-check",
  "drain-node",
  "resume-node",
  "restart-service",
  "verify-backup",
  "rotate-logs",
] as const;
export const INFRASTRUCTURE_ACTION_STATUSES = [
  "proposed",
  "approved",
  "rejected",
  "executing",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export const INFRASTRUCTURE_INCIDENT_STATUSES = ["open", "mitigating", "resolved"] as const;
export const INFRASTRUCTURE_BACKUP_STATUSES = ["unknown", "healthy", "stale", "failed"] as const;

export type InfrastructurePlatform = (typeof INFRASTRUCTURE_PLATFORMS)[number];
export type InfrastructureNodeRole = (typeof INFRASTRUCTURE_NODE_ROLES)[number];
export type InfrastructureNodeStatus = (typeof INFRASTRUCTURE_NODE_STATUSES)[number];
export type InfrastructureServiceStatus = (typeof INFRASTRUCTURE_SERVICE_STATUSES)[number];
export type InfrastructureAlertSeverity = (typeof INFRASTRUCTURE_ALERT_SEVERITIES)[number];
export type InfrastructureAlertStatus = (typeof INFRASTRUCTURE_ALERT_STATUSES)[number];
export type InfrastructureActionKind = (typeof INFRASTRUCTURE_ACTION_KINDS)[number];
export type InfrastructureActionStatus = (typeof INFRASTRUCTURE_ACTION_STATUSES)[number];
export type InfrastructureIncidentStatus = (typeof INFRASTRUCTURE_INCIDENT_STATUSES)[number];
export type InfrastructureBackupStatus = (typeof INFRASTRUCTURE_BACKUP_STATUSES)[number];
export type InfrastructureRisk = "low" | "moderate" | "high" | "critical";

export interface InfrastructureCapacity {
  cpuCores: number;
  memoryTotalBytes: number;
  swapTotalBytes: number;
  diskTotalBytes: number;
  gpuMemoryTotalBytes: number | null;
}

export interface InfrastructureNode {
  id: string;
  name: string;
  hostname: string;
  platform: InfrastructurePlatform;
  architecture: string;
  role: InfrastructureNodeRole;
  status: InfrastructureNodeStatus;
  labels: string[];
  capabilities: string[];
  agentVersion: string;
  capacity: InfrastructureCapacity;
  metadata: Record<string, unknown>;
  registeredAt: string;
  lastSeenAt: string;
}

export interface InfrastructureMetricSample {
  id: string;
  nodeId: string;
  observedAt: string;
  cpuUtilization: number;
  load1: number;
  memoryUsedBytes: number;
  swapUsedBytes: number;
  diskUsedBytes: number;
  temperatureC: number | null;
  networkRxBytes: number | null;
  networkTxBytes: number | null;
  processCount: number | null;
  metadata: Record<string, unknown>;
}

export interface InfrastructureServiceRecord {
  id: string;
  nodeId: string;
  name: string;
  kind: string;
  endpoint: string | null;
  status: InfrastructureServiceStatus;
  lastCheckedAt: string;
  metadata: Record<string, unknown>;
}

export interface InfrastructureAlert {
  id: string;
  nodeId: string;
  kind: string;
  severity: InfrastructureAlertSeverity;
  status: InfrastructureAlertStatus;
  dedupeKey: string;
  summary: string;
  detail: Record<string, unknown>;
  openedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface InfrastructureActionRequest {
  id: string;
  nodeId: string;
  incidentId: string | null;
  kind: InfrastructureActionKind;
  target: string;
  parameters: Record<string, unknown>;
  risk: InfrastructureRisk;
  status: InfrastructureActionStatus;
  dryRun: boolean;
  requestedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalScope: string | null;
  executedAt: string | null;
  result: Record<string, unknown> | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface InfrastructureIncident {
  id: string;
  title: string;
  severity: InfrastructureAlertSeverity;
  status: InfrastructureIncidentStatus;
  nodeIds: string[];
  alertIds: string[];
  summary: string;
  rootCause: string | null;
  resolution: string | null;
  openedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  metadata: Record<string, unknown>;
}

export interface InfrastructureEvent {
  id: string;
  nodeId: string | null;
  actionId: string | null;
  incidentId: string | null;
  type: string;
  actor: string;
  summary: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface InfrastructureBackupRecord {
  id: string;
  nodeId: string;
  name: string;
  source: string;
  repository: string;
  status: InfrastructureBackupStatus;
  lastSuccessfulAt: string | null;
  lastVerifiedAt: string | null;
  verificationMethod: string | null;
  restorePoint: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface InfrastructureBackupVerification {
  id: string;
  backupId: string;
  verifiedAt: string;
  success: boolean;
  method: string;
  detail: string;
  performedBy: string;
  metadata: Record<string, unknown>;
}

export interface InfrastructureNodeHeartbeat {
  observedAt?: string;
  capacity?: Partial<InfrastructureCapacity>;
  metric: Omit<InfrastructureMetricSample, "id" | "nodeId" | "observedAt">;
  services?: Array<Omit<InfrastructureServiceRecord, "nodeId" | "lastCheckedAt"> & { lastCheckedAt?: string }>;
  metadata?: Record<string, unknown>;
}

export interface InfrastructureNodeView {
  node: InfrastructureNode;
  effectiveStatus: InfrastructureNodeStatus;
  latestMetric: InfrastructureMetricSample | null;
  services: InfrastructureServiceRecord[];
  openAlerts: InfrastructureAlert[];
}

export interface InfrastructureFleetSnapshot {
  generatedAt: string;
  nodes: InfrastructureNodeView[];
  openAlerts: InfrastructureAlert[];
  openIncidents: InfrastructureIncident[];
  backups: InfrastructureBackupRecord[];
  totals: {
    registeredNodes: number;
    onlineNodes: number;
    degradedNodes: number;
    offlineNodes: number;
    maintenanceNodes: number;
    memoryTotalBytes: number;
    memoryUsedBytes: number;
    diskTotalBytes: number;
    diskUsedBytes: number;
    openAlerts: number;
    openIncidents: number;
  };
}

export interface InfrastructureWorkloadRequest {
  workloadId: string;
  requiredCapabilities: string[];
  preferredLabels: string[];
  minimumCpuCores: number;
  minimumFreeMemoryBytes: number;
  minimumFreeDiskBytes: number;
  minimumGpuMemoryBytes: number;
  allowDegraded: boolean;
  priority: number;
}

export interface InfrastructureSchedulingDecision {
  workloadId: string;
  selectedNodeId: string | null;
  candidates: Array<{
    nodeId: string;
    accepted: boolean;
    score: number;
    reasons: string[];
  }>;
  decidedAt: string;
}

export interface InfrastructureActionExecutionResult {
  executed: boolean;
  success: boolean;
  message: string;
  detail: Record<string, unknown>;
}

export interface InfrastructureMissionContext {
  summary: string;
  generatedAt: string;
  nodeIds: string[];
  evidence: Array<{ id: string; source: string; locator: string; retrievedAt: string }>;
  uncertainties: string[];
}
