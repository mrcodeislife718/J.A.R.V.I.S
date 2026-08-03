import { randomUUID } from "node:crypto";
import type { InfrastructureActionExecutor } from "./action-executor.js";
import {
  DEFAULT_INFRASTRUCTURE_THRESHOLDS,
  actionRisk,
  evaluateMetricThresholds,
  isNodeStale,
  type InfrastructureThresholds,
} from "./policy.js";
import type { InfrastructureRepository } from "./repository.js";
import { InfrastructureScheduler } from "./scheduler.js";
import type {
  InfrastructureActionKind,
  InfrastructureActionRequest,
  InfrastructureAlert,
  InfrastructureAlertSeverity,
  InfrastructureBackupRecord,
  InfrastructureBackupVerification,
  InfrastructureEvent,
  InfrastructureFleetSnapshot,
  InfrastructureIncident,
  InfrastructureMetricSample,
  InfrastructureMissionContext,
  InfrastructureNode,
  InfrastructureNodeHeartbeat,
  InfrastructureNodeRole,
  InfrastructureNodeStatus,
  InfrastructureNodeView,
  InfrastructurePlatform,
  InfrastructureSchedulingDecision,
  InfrastructureServiceRecord,
  InfrastructureWorkloadRequest,
} from "./types.js";

export interface RegisterInfrastructureNodeInput {
  id?: string;
  name: string;
  hostname: string;
  platform: InfrastructurePlatform;
  architecture: string;
  role: InfrastructureNodeRole;
  labels?: string[];
  capabilities?: string[];
  agentVersion: string;
  capacity: InfrastructureNode["capacity"];
  metadata?: Record<string, unknown>;
}

export interface RequestInfrastructureActionInput {
  nodeId: string;
  incidentId?: string;
  kind: InfrastructureActionKind;
  target: string;
  parameters?: Record<string, unknown>;
  dryRun?: boolean;
  requestedBy: string;
  idempotencyKey?: string;
}

export interface CreateInfrastructureIncidentInput {
  title: string;
  severity: InfrastructureAlertSeverity;
  nodeIds?: string[];
  alertIds?: string[];
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertInfrastructureBackupInput {
  id?: string;
  nodeId: string;
  name: string;
  source: string;
  repository: string;
  status?: InfrastructureBackupRecord["status"];
  lastSuccessfulAt?: string;
  restorePoint?: string;
  metadata?: Record<string, unknown>;
}

const normalizeList = (items: string[] | undefined): string[] =>
  [...new Set((items ?? []).map((item) => item.trim()).filter(Boolean))].sort();

const requireFiniteNonnegative = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative finite number`);
};

const requireRatio = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1`);
  }
};

export class InfrastructureService {
  private readonly scheduler: InfrastructureScheduler;

  constructor(
    private readonly repository: InfrastructureRepository,
    private readonly actionExecutor: InfrastructureActionExecutor,
    private readonly thresholds: InfrastructureThresholds = DEFAULT_INFRASTRUCTURE_THRESHOLDS,
  ) {
    this.scheduler = new InfrastructureScheduler(thresholds.staleAfterMs);
  }

  async registerNode(input: RegisterInfrastructureNodeInput): Promise<InfrastructureNode> {
    requireFiniteNonnegative(input.capacity.cpuCores, "CPU cores");
    requireFiniteNonnegative(input.capacity.memoryTotalBytes, "Memory capacity");
    requireFiniteNonnegative(input.capacity.swapTotalBytes, "Swap capacity");
    requireFiniteNonnegative(input.capacity.diskTotalBytes, "Disk capacity");
    if (input.capacity.gpuMemoryTotalBytes !== null) {
      requireFiniteNonnegative(input.capacity.gpuMemoryTotalBytes, "GPU memory capacity");
    }

    const now = new Date().toISOString();
    const id = input.id?.trim() || randomUUID();
    const existing = await this.repository.getNode(id);
    const node: InfrastructureNode = {
      id,
      name: input.name.trim(),
      hostname: input.hostname.trim(),
      platform: input.platform,
      architecture: input.architecture.trim(),
      role: input.role,
      status: existing?.status ?? "online",
      labels: normalizeList(input.labels),
      capabilities: normalizeList(input.capabilities),
      agentVersion: input.agentVersion.trim(),
      capacity: structuredClone(input.capacity),
      metadata: { ...(existing?.metadata ?? {}), ...(input.metadata ?? {}) },
      registeredAt: existing?.registeredAt ?? now,
      lastSeenAt: now,
    };
    await this.repository.saveNode(node);
    await this.appendEvent({
      nodeId: node.id,
      type: existing ? "node.updated" : "node.registered",
      actor: "infrastructure-control-plane",
      summary: `${existing ? "Updated" : "Registered"} node ${node.name}`,
      metadata: { role: node.role, capabilities: node.capabilities },
    });
    return node;
  }

  async heartbeat(nodeId: string, heartbeat: InfrastructureNodeHeartbeat): Promise<InfrastructureNodeView> {
    const node = await this.requireNode(nodeId);
    const observedAt = heartbeat.observedAt ?? new Date().toISOString();
    const metricInput = heartbeat.metric;
    requireRatio(metricInput.cpuUtilization, "CPU utilization");
    requireFiniteNonnegative(metricInput.load1, "Load average");
    requireFiniteNonnegative(metricInput.memoryUsedBytes, "Memory used");
    requireFiniteNonnegative(metricInput.swapUsedBytes, "Swap used");
    requireFiniteNonnegative(metricInput.diskUsedBytes, "Disk used");

    node.lastSeenAt = observedAt;
    node.metadata = { ...node.metadata, ...(heartbeat.metadata ?? {}) };
    if (heartbeat.capacity) {
      node.capacity = {
        cpuCores: heartbeat.capacity.cpuCores ?? node.capacity.cpuCores,
        memoryTotalBytes: heartbeat.capacity.memoryTotalBytes ?? node.capacity.memoryTotalBytes,
        swapTotalBytes: heartbeat.capacity.swapTotalBytes ?? node.capacity.swapTotalBytes,
        diskTotalBytes: heartbeat.capacity.diskTotalBytes ?? node.capacity.diskTotalBytes,
        gpuMemoryTotalBytes:
          heartbeat.capacity.gpuMemoryTotalBytes === undefined
            ? node.capacity.gpuMemoryTotalBytes
            : heartbeat.capacity.gpuMemoryTotalBytes,
      };
    }

    const metric: InfrastructureMetricSample = {
      id: randomUUID(),
      nodeId,
      observedAt,
      cpuUtilization: metricInput.cpuUtilization,
      load1: metricInput.load1,
      memoryUsedBytes: metricInput.memoryUsedBytes,
      swapUsedBytes: metricInput.swapUsedBytes,
      diskUsedBytes: metricInput.diskUsedBytes,
      temperatureC: metricInput.temperatureC,
      networkRxBytes: metricInput.networkRxBytes,
      networkTxBytes: metricInput.networkTxBytes,
      processCount: metricInput.processCount,
      metadata: structuredClone(metricInput.metadata),
    };
    await this.repository.saveMetric(metric);

    for (const serviceInput of heartbeat.services ?? []) {
      const service: InfrastructureServiceRecord = {
        id: serviceInput.id,
        nodeId,
        name: serviceInput.name,
        kind: serviceInput.kind,
        endpoint: serviceInput.endpoint,
        status: serviceInput.status,
        lastCheckedAt: serviceInput.lastCheckedAt ?? observedAt,
        metadata: structuredClone(serviceInput.metadata),
      };
      await this.repository.saveService(service);
      await this.evaluateServiceAlert(service);
    }

    await this.evaluateMetricAlerts(node, metric);
    const openAlerts = await this.repository.listAlerts({ nodeId, status: "open" });
    if (node.status !== "maintenance") {
      node.status = openAlerts.some((alert) => alert.severity === "critical" || alert.severity === "warning")
        ? "degraded"
        : "online";
    }
    await this.repository.saveNode(node);
    await this.appendEvent({
      nodeId,
      type: "node.heartbeat",
      actor: "node-agent",
      summary: `Received heartbeat from ${node.name}`,
      metadata: { metricId: metric.id, status: node.status },
    });
    return this.getNodeView(nodeId);
  }

  async getNode(id: string): Promise<InfrastructureNode | null> {
    return this.repository.getNode(id);
  }

  async listNodes(): Promise<InfrastructureNodeView[]> {
    const nodes = await this.repository.listNodes();
    return Promise.all(nodes.map((node) => this.buildNodeView(node)));
  }

  async getNodeView(id: string): Promise<InfrastructureNodeView> {
    return this.buildNodeView(await this.requireNode(id));
  }

  async listMetrics(nodeId: string, limit = 100): Promise<InfrastructureMetricSample[]> {
    await this.requireNode(nodeId);
    return this.repository.listMetrics(nodeId, limit);
  }

  async fleetSnapshot(now = new Date()): Promise<InfrastructureFleetSnapshot> {
    const [nodes, openAlerts, openIncidents, backups] = await Promise.all([
      this.listNodes(),
      this.repository.listAlerts({ status: "open", limit: 1_000 }),
      this.repository.listIncidents({ status: "open", limit: 1_000 }),
      this.repository.listBackups(),
    ]);
    const nowMs = now.getTime();
    const normalized = nodes.map((view) => ({
      ...view,
      effectiveStatus: isNodeStale(view.node, nowMs, this.thresholds.staleAfterMs)
        ? "offline" as const
        : view.effectiveStatus,
    }));
    const statusCount = (status: InfrastructureNodeStatus): number =>
      normalized.filter((view) => view.effectiveStatus === status).length;

    return {
      generatedAt: now.toISOString(),
      nodes: normalized,
      openAlerts,
      openIncidents,
      backups,
      totals: {
        registeredNodes: normalized.length,
        onlineNodes: statusCount("online"),
        degradedNodes: statusCount("degraded"),
        offlineNodes: statusCount("offline"),
        maintenanceNodes: statusCount("maintenance"),
        memoryTotalBytes: normalized.reduce((sum, view) => sum + view.node.capacity.memoryTotalBytes, 0),
        memoryUsedBytes: normalized.reduce((sum, view) => sum + (view.latestMetric?.memoryUsedBytes ?? 0), 0),
        diskTotalBytes: normalized.reduce((sum, view) => sum + view.node.capacity.diskTotalBytes, 0),
        diskUsedBytes: normalized.reduce((sum, view) => sum + (view.latestMetric?.diskUsedBytes ?? 0), 0),
        openAlerts: openAlerts.length,
        openIncidents: openIncidents.length,
      },
    };
  }

  async schedule(request: InfrastructureWorkloadRequest): Promise<InfrastructureSchedulingDecision> {
    requireFiniteNonnegative(request.minimumCpuCores, "Minimum CPU cores");
    requireFiniteNonnegative(request.minimumFreeMemoryBytes, "Minimum free memory");
    requireFiniteNonnegative(request.minimumFreeDiskBytes, "Minimum free disk");
    requireFiniteNonnegative(request.minimumGpuMemoryBytes, "Minimum GPU memory");
    const decision = this.scheduler.decide(
      {
        ...request,
        requiredCapabilities: normalizeList(request.requiredCapabilities),
        preferredLabels: normalizeList(request.preferredLabels),
      },
      await this.listNodes(),
    );
    await this.appendEvent({
      nodeId: decision.selectedNodeId,
      type: "workload.scheduled",
      actor: "resource-scheduler",
      summary: decision.selectedNodeId
        ? `Scheduled ${request.workloadId} to ${decision.selectedNodeId}`
        : `No eligible node found for ${request.workloadId}`,
      metadata: { request, candidates: decision.candidates },
    });
    return decision;
  }

  async requestAction(input: RequestInfrastructureActionInput): Promise<InfrastructureActionRequest> {
    await this.requireNode(input.nodeId);
    if (input.incidentId) await this.requireIncident(input.incidentId);
    const idempotencyKey = input.idempotencyKey?.trim() || randomUUID();
    const existing = await this.repository.getActionByIdempotencyKey(idempotencyKey);
    if (existing) return existing;

    const now = new Date().toISOString();
    const action: InfrastructureActionRequest = {
      id: randomUUID(),
      nodeId: input.nodeId,
      incidentId: input.incidentId ?? null,
      kind: input.kind,
      target: input.target.trim(),
      parameters: structuredClone(input.parameters ?? {}),
      risk: actionRisk(input.kind),
      status: "proposed",
      dryRun: input.dryRun ?? true,
      requestedBy: input.requestedBy.trim(),
      approvedBy: null,
      approvedAt: null,
      approvalScope: null,
      executedAt: null,
      result: null,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveAction(action);
    await this.appendEvent({
      nodeId: action.nodeId,
      actionId: action.id,
      incidentId: action.incidentId,
      type: "action.proposed",
      actor: action.requestedBy,
      summary: `Proposed ${action.kind} for ${action.target}`,
      metadata: { risk: action.risk, dryRun: action.dryRun },
    });
    return action;
  }

  async approveAction(
    actionId: string,
    approvedBy: string,
    scope: string,
  ): Promise<InfrastructureActionRequest> {
    const action = await this.requireAction(actionId);
    if (action.status !== "proposed") throw new Error("Only proposed actions can be approved");
    action.status = "approved";
    action.approvedBy = approvedBy.trim();
    action.approvedAt = new Date().toISOString();
    action.approvalScope = scope.trim();
    action.updatedAt = action.approvedAt;
    await this.repository.saveAction(action);
    await this.appendEvent({
      nodeId: action.nodeId,
      actionId: action.id,
      incidentId: action.incidentId,
      type: "action.approved",
      actor: action.approvedBy,
      summary: `Approved ${action.kind} for ${action.target}`,
      metadata: { scope: action.approvalScope, risk: action.risk },
    });
    return action;
  }

  async rejectAction(actionId: string, rejectedBy: string, reason: string): Promise<InfrastructureActionRequest> {
    const action = await this.requireAction(actionId);
    if (action.status !== "proposed" && action.status !== "approved") {
      throw new Error("Only proposed or approved actions can be rejected");
    }
    action.status = "rejected";
    action.result = { reason: reason.trim(), rejectedBy: rejectedBy.trim() };
    action.updatedAt = new Date().toISOString();
    await this.repository.saveAction(action);
    await this.appendEvent({
      nodeId: action.nodeId,
      actionId: action.id,
      incidentId: action.incidentId,
      type: "action.rejected",
      actor: rejectedBy.trim(),
      summary: `Rejected ${action.kind} for ${action.target}`,
      metadata: { reason: reason.trim() },
    });
    return action;
  }

  async executeAction(actionId: string): Promise<InfrastructureActionRequest> {
    const action = await this.requireAction(actionId);
    if (action.status !== "approved") throw new Error("Action requires explicit approval before execution");
    if (!action.approvedBy || !action.approvedAt || !action.approvalScope) {
      throw new Error("Action approval record is incomplete");
    }
    const node = await this.requireNode(action.nodeId);
    const services = await this.repository.listServices(node.id);
    action.status = "executing";
    action.updatedAt = new Date().toISOString();
    await this.repository.saveAction(action);
    await this.appendEvent({
      nodeId: action.nodeId,
      actionId: action.id,
      incidentId: action.incidentId,
      type: "action.executing",
      actor: "infrastructure-action-executor",
      summary: `Executing ${action.kind} for ${action.target}`,
      metadata: { dryRun: action.dryRun },
    });

    try {
      const result = await this.actionExecutor.execute(action, { node, services });
      action.status = result.success ? "succeeded" : "failed";
      action.executedAt = new Date().toISOString();
      action.updatedAt = action.executedAt;
      action.result = {
        executed: result.executed,
        message: result.message,
        detail: result.detail,
      };
      if (result.success && result.executed && !action.dryRun) {
        if (action.kind === "drain-node") node.status = "maintenance";
        if (action.kind === "resume-node") node.status = "online";
        await this.repository.saveNode(node);
      }
      await this.repository.saveAction(action);
      await this.appendEvent({
        nodeId: action.nodeId,
        actionId: action.id,
        incidentId: action.incidentId,
        type: result.success ? "action.succeeded" : "action.failed",
        actor: "infrastructure-action-executor",
        summary: result.message,
        metadata: { executed: result.executed, detail: result.detail },
      });
      return action;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown action execution failure";
      action.status = "failed";
      action.executedAt = new Date().toISOString();
      action.updatedAt = action.executedAt;
      action.result = { error: message };
      await this.repository.saveAction(action);
      await this.appendEvent({
        nodeId: action.nodeId,
        actionId: action.id,
        incidentId: action.incidentId,
        type: "action.failed",
        actor: "infrastructure-action-executor",
        summary: message,
        metadata: {},
      });
      return action;
    }
  }

  async listActions(nodeId?: string, limit = 200): Promise<InfrastructureActionRequest[]> {
    return this.repository.listActions(nodeId ? { nodeId, limit } : { limit });
  }

  async listAlerts(nodeId?: string, status?: InfrastructureAlert["status"]): Promise<InfrastructureAlert[]> {
    const options: { nodeId?: string; status?: InfrastructureAlert["status"]; limit: number } = { limit: 1_000 };
    if (nodeId) options.nodeId = nodeId;
    if (status) options.status = status;
    return this.repository.listAlerts(options);
  }

  async resolveAlert(alertId: string, resolvedBy: string, note?: string): Promise<InfrastructureAlert> {
    const alert = await this.repository.getAlert(alertId);
    if (!alert) throw new Error("Alert not found");
    if (alert.status === "resolved") return alert;
    const now = new Date().toISOString();
    alert.status = "resolved";
    alert.updatedAt = now;
    alert.resolvedAt = now;
    alert.resolvedBy = resolvedBy.trim();
    alert.detail = { ...alert.detail, resolutionNote: note?.trim() ?? null };
    await this.repository.saveAlert(alert);
    await this.appendEvent({
      nodeId: alert.nodeId,
      type: "alert.resolved",
      actor: alert.resolvedBy,
      summary: `Resolved alert: ${alert.summary}`,
      metadata: { alertId: alert.id, note: note ?? null },
    });
    return alert;
  }

  async createIncident(input: CreateInfrastructureIncidentInput): Promise<InfrastructureIncident> {
    const nodeIds = normalizeList(input.nodeIds);
    const alertIds = normalizeList(input.alertIds);
    for (const nodeId of nodeIds) await this.requireNode(nodeId);
    const now = new Date().toISOString();
    const incident: InfrastructureIncident = {
      id: randomUUID(),
      title: input.title.trim(),
      severity: input.severity,
      status: "open",
      nodeIds,
      alertIds,
      summary: input.summary.trim(),
      rootCause: null,
      resolution: null,
      openedAt: now,
      updatedAt: now,
      resolvedAt: null,
      metadata: structuredClone(input.metadata ?? {}),
    };
    await this.repository.saveIncident(incident);
    await this.appendEvent({
      incidentId: incident.id,
      type: "incident.opened",
      actor: "infrastructure-control-plane",
      summary: incident.title,
      metadata: { severity: incident.severity, nodeIds, alertIds },
    });
    return incident;
  }

  async updateIncident(
    incidentId: string,
    input: {
      status?: InfrastructureIncident["status"];
      rootCause?: string;
      resolution?: string;
      summary?: string;
      actor: string;
    },
  ): Promise<InfrastructureIncident> {
    const incident = await this.requireIncident(incidentId);
    if (input.status) incident.status = input.status;
    if (input.rootCause !== undefined) incident.rootCause = input.rootCause.trim() || null;
    if (input.resolution !== undefined) incident.resolution = input.resolution.trim() || null;
    if (input.summary !== undefined) incident.summary = input.summary.trim();
    incident.updatedAt = new Date().toISOString();
    incident.resolvedAt = incident.status === "resolved" ? incident.updatedAt : null;
    await this.repository.saveIncident(incident);
    await this.appendEvent({
      incidentId: incident.id,
      type: `incident.${incident.status}`,
      actor: input.actor.trim(),
      summary: `Incident ${incident.title} is ${incident.status}`,
      metadata: { rootCause: incident.rootCause, resolution: incident.resolution },
    });
    return incident;
  }

  async listIncidents(status?: InfrastructureIncident["status"]): Promise<InfrastructureIncident[]> {
    return this.repository.listIncidents(status ? { status, limit: 500 } : { limit: 500 });
  }

  async getIncident(id: string): Promise<InfrastructureIncident | null> {
    return this.repository.getIncident(id);
  }

  async upsertBackup(input: UpsertInfrastructureBackupInput): Promise<InfrastructureBackupRecord> {
    await this.requireNode(input.nodeId);
    const now = new Date().toISOString();
    const id = input.id?.trim() || randomUUID();
    const existing = await this.repository.getBackup(id);
    const backup: InfrastructureBackupRecord = {
      id,
      nodeId: input.nodeId,
      name: input.name.trim(),
      source: input.source.trim(),
      repository: input.repository.trim(),
      status: input.status ?? existing?.status ?? "unknown",
      lastSuccessfulAt: input.lastSuccessfulAt ?? existing?.lastSuccessfulAt ?? null,
      lastVerifiedAt: existing?.lastVerifiedAt ?? null,
      verificationMethod: existing?.verificationMethod ?? null,
      restorePoint: input.restorePoint ?? existing?.restorePoint ?? null,
      metadata: { ...(existing?.metadata ?? {}), ...(input.metadata ?? {}) },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.repository.saveBackup(backup);
    await this.appendEvent({
      nodeId: backup.nodeId,
      type: existing ? "backup.updated" : "backup.registered",
      actor: "backup-registry",
      summary: `${existing ? "Updated" : "Registered"} backup ${backup.name}`,
      metadata: { backupId: backup.id, status: backup.status },
    });
    return backup;
  }

  async recordBackupVerification(
    backupId: string,
    input: {
      success: boolean;
      method: string;
      detail: string;
      performedBy: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<{ backup: InfrastructureBackupRecord; verification: InfrastructureBackupVerification }> {
    const backup = await this.requireBackup(backupId);
    const now = new Date().toISOString();
    const verification: InfrastructureBackupVerification = {
      id: randomUUID(),
      backupId,
      verifiedAt: now,
      success: input.success,
      method: input.method.trim(),
      detail: input.detail.trim(),
      performedBy: input.performedBy.trim(),
      metadata: structuredClone(input.metadata ?? {}),
    };
    backup.status = input.success ? "healthy" : "failed";
    backup.lastVerifiedAt = now;
    backup.verificationMethod = verification.method;
    backup.updatedAt = now;
    await this.repository.saveBackupVerification(verification);
    await this.repository.saveBackup(backup);
    await this.appendEvent({
      nodeId: backup.nodeId,
      type: input.success ? "backup.verified" : "backup.verification-failed",
      actor: verification.performedBy,
      summary: `${backup.name}: ${verification.detail}`,
      metadata: { backupId, verificationId: verification.id, method: verification.method },
    });
    return { backup, verification };
  }

  async listBackups(nodeId?: string): Promise<InfrastructureBackupRecord[]> {
    return this.repository.listBackups(nodeId);
  }

  async listBackupVerifications(backupId: string): Promise<InfrastructureBackupVerification[]> {
    await this.requireBackup(backupId);
    return this.repository.listBackupVerifications(backupId, 200);
  }

  async listEvents(input: {
    nodeId?: string;
    actionId?: string;
    incidentId?: string;
    limit?: number;
  } = {}): Promise<InfrastructureEvent[]> {
    return this.repository.listEvents(input);
  }

  async buildMissionContext(nodeId?: string): Promise<InfrastructureMissionContext> {
    const snapshot = await this.fleetSnapshot();
    const views = nodeId
      ? snapshot.nodes.filter((view) => view.node.id === nodeId)
      : snapshot.nodes;
    if (nodeId && views.length === 0) throw new Error("Infrastructure node not found");
    const uncertainties: string[] = [];
    const lines = [
      `Fleet generated at ${snapshot.generatedAt}`,
      `Registered ${snapshot.totals.registeredNodes}; online ${snapshot.totals.onlineNodes}; degraded ${snapshot.totals.degradedNodes}; offline ${snapshot.totals.offlineNodes}; maintenance ${snapshot.totals.maintenanceNodes}.`,
      `Open alerts ${snapshot.totals.openAlerts}; open incidents ${snapshot.totals.openIncidents}.`,
    ];
    for (const view of views.slice(0, 50)) {
      const metric = view.latestMetric;
      if (!metric) uncertainties.push(`No metric sample exists for ${view.node.name}`);
      if (isNodeStale(view.node, Date.now(), this.thresholds.staleAfterMs)) {
        uncertainties.push(`${view.node.name} heartbeat is stale`);
      }
      lines.push(
        [
          `Node ${view.node.name} [${view.node.id}] status=${view.effectiveStatus}`,
          `role=${view.node.role}`,
          `platform=${view.node.platform}/${view.node.architecture}`,
          `capabilities=${view.node.capabilities.join(",") || "none"}`,
          metric
            ? `cpu=${(metric.cpuUtilization * 100).toFixed(1)}% memory=${metric.memoryUsedBytes}/${view.node.capacity.memoryTotalBytes} disk=${metric.diskUsedBytes}/${view.node.capacity.diskTotalBytes}`
            : "metrics=missing",
          `services=${view.services.map((service) => `${service.name}:${service.status}`).join(",") || "none"}`,
          `alerts=${view.openAlerts.map((alert) => `${alert.severity}:${alert.kind}`).join(",") || "none"}`,
        ].join(" | "),
      );
    }

    const evidence = views.flatMap((view) => {
      const references = [
        {
          id: view.node.id,
          source: `infrastructure:node:${view.node.id}`,
          locator: `lastSeenAt=${view.node.lastSeenAt}`,
          retrievedAt: snapshot.generatedAt,
        },
      ];
      if (view.latestMetric) {
        references.push({
          id: view.latestMetric.id,
          source: `infrastructure:metric:${view.node.id}`,
          locator: `observedAt=${view.latestMetric.observedAt}`,
          retrievedAt: snapshot.generatedAt,
        });
      }
      for (const alert of view.openAlerts) {
        references.push({
          id: alert.id,
          source: `infrastructure:alert:${view.node.id}`,
          locator: `openedAt=${alert.openedAt}`,
          retrievedAt: snapshot.generatedAt,
        });
      }
      return references;
    });

    return {
      summary: lines.join("\n").slice(0, 18_000),
      generatedAt: snapshot.generatedAt,
      nodeIds: views.map((view) => view.node.id),
      evidence,
      uncertainties,
    };
  }

  private async buildNodeView(node: InfrastructureNode): Promise<InfrastructureNodeView> {
    const [latestMetric, services, openAlerts] = await Promise.all([
      this.repository.latestMetric(node.id),
      this.repository.listServices(node.id),
      this.repository.listAlerts({ nodeId: node.id, status: "open", limit: 200 }),
    ]);
    return {
      node,
      effectiveStatus: node.status,
      latestMetric,
      services,
      openAlerts,
    };
  }

  private async evaluateMetricAlerts(node: InfrastructureNode, metric: InfrastructureMetricSample): Promise<void> {
    const openAlerts = await this.repository.listAlerts({ nodeId: node.id, status: "open", limit: 500 });
    for (const evaluation of evaluateMetricThresholds(node, metric, this.thresholds)) {
      const dedupeKey = `${node.id}:${evaluation.kind}`;
      const existing = openAlerts.find((alert) => alert.dedupeKey === dedupeKey);
      if (evaluation.active) {
        const now = new Date().toISOString();
        const alert: InfrastructureAlert = existing ?? {
          id: randomUUID(),
          nodeId: node.id,
          kind: evaluation.kind,
          severity: evaluation.severity,
          status: "open",
          dedupeKey,
          summary: evaluation.summary,
          detail: {},
          openedAt: now,
          updatedAt: now,
          resolvedAt: null,
          resolvedBy: null,
        };
        alert.severity = evaluation.severity;
        alert.summary = evaluation.summary;
        alert.detail = {
          ratio: evaluation.ratio,
          threshold: evaluation.threshold,
          metricId: metric.id,
        };
        alert.updatedAt = now;
        await this.repository.saveAlert(alert);
        if (!existing) {
          await this.appendEvent({
            nodeId: node.id,
            type: "alert.opened",
            actor: "health-policy",
            summary: alert.summary,
            metadata: { alertId: alert.id, severity: alert.severity },
          });
        }
      } else if (existing) {
        await this.resolveAlert(existing.id, "health-policy", "Metric returned below threshold");
      }
    }
  }

  private async evaluateServiceAlert(service: InfrastructureServiceRecord): Promise<void> {
    const dedupeKey = `${service.nodeId}:service:${service.id}`;
    const existing = (await this.repository.listAlerts({
      nodeId: service.nodeId,
      status: "open",
      limit: 500,
    })).find((alert) => alert.dedupeKey === dedupeKey);
    if (service.status === "healthy" || service.status === "unknown") {
      if (existing && service.status === "healthy") {
        await this.resolveAlert(existing.id, "service-health-policy", "Service returned to healthy");
      }
      return;
    }
    const now = new Date().toISOString();
    const alert: InfrastructureAlert = existing ?? {
      id: randomUUID(),
      nodeId: service.nodeId,
      kind: "service-unhealthy",
      severity: service.status === "unavailable" ? "critical" : "warning",
      status: "open",
      dedupeKey,
      summary: `${service.name} is ${service.status}`,
      detail: {},
      openedAt: now,
      updatedAt: now,
      resolvedAt: null,
      resolvedBy: null,
    };
    alert.severity = service.status === "unavailable" ? "critical" : "warning";
    alert.summary = `${service.name} is ${service.status}`;
    alert.detail = { serviceId: service.id, lastCheckedAt: service.lastCheckedAt };
    alert.updatedAt = now;
    await this.repository.saveAlert(alert);
    if (!existing) {
      await this.appendEvent({
        nodeId: service.nodeId,
        type: "alert.opened",
        actor: "service-health-policy",
        summary: alert.summary,
        metadata: { alertId: alert.id, serviceId: service.id },
      });
    }
  }

  private async requireNode(id: string): Promise<InfrastructureNode> {
    const node = await this.repository.getNode(id);
    if (!node) throw new Error("Infrastructure node not found");
    return node;
  }

  private async requireAction(id: string): Promise<InfrastructureActionRequest> {
    const action = await this.repository.getAction(id);
    if (!action) throw new Error("Infrastructure action not found");
    return action;
  }

  private async requireIncident(id: string): Promise<InfrastructureIncident> {
    const incident = await this.repository.getIncident(id);
    if (!incident) throw new Error("Infrastructure incident not found");
    return incident;
  }

  private async requireBackup(id: string): Promise<InfrastructureBackupRecord> {
    const backup = await this.repository.getBackup(id);
    if (!backup) throw new Error("Infrastructure backup not found");
    return backup;
  }

  private async appendEvent(input: {
    nodeId?: string | null;
    actionId?: string | null;
    incidentId?: string | null;
    type: string;
    actor: string;
    summary: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await this.repository.appendEvent({
      id: randomUUID(),
      nodeId: input.nodeId ?? null,
      actionId: input.actionId ?? null,
      incidentId: input.incidentId ?? null,
      type: input.type,
      actor: input.actor,
      summary: input.summary,
      occurredAt: new Date().toISOString(),
      metadata: structuredClone(input.metadata),
    });
  }
}
