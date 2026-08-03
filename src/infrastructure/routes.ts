import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type {
  CreateInfrastructureIncidentInput,
  RegisterInfrastructureNodeInput,
  RequestInfrastructureActionInput,
  UpsertInfrastructureBackupInput,
} from "./service.js";
import { InfrastructureService } from "./service.js";
import {
  INFRASTRUCTURE_ACTION_KINDS,
  INFRASTRUCTURE_ALERT_SEVERITIES,
  INFRASTRUCTURE_ALERT_STATUSES,
  INFRASTRUCTURE_BACKUP_STATUSES,
  INFRASTRUCTURE_INCIDENT_STATUSES,
  INFRASTRUCTURE_NODE_ROLES,
  INFRASTRUCTURE_PLATFORMS,
  INFRASTRUCTURE_SERVICE_STATUSES,
} from "./types.js";

const metadataSchema = z.record(z.string(), z.unknown()).default({});
const capacitySchema = z.object({
  cpuCores: z.number().nonnegative(),
  memoryTotalBytes: z.number().nonnegative(),
  swapTotalBytes: z.number().nonnegative(),
  diskTotalBytes: z.number().nonnegative(),
  gpuMemoryTotalBytes: z.number().nonnegative().nullable(),
});

const nodeSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(200),
  hostname: z.string().min(1).max(300),
  platform: z.enum(INFRASTRUCTURE_PLATFORMS),
  architecture: z.string().min(1).max(100),
  role: z.enum(INFRASTRUCTURE_NODE_ROLES),
  labels: z.array(z.string().min(1).max(100)).max(100).optional(),
  capabilities: z.array(z.string().min(1).max(150)).max(200).optional(),
  agentVersion: z.string().min(1).max(100),
  capacity: capacitySchema,
  metadata: metadataSchema.optional(),
});

const metricSchema = z.object({
  cpuUtilization: z.number().min(0).max(1),
  load1: z.number().nonnegative(),
  memoryUsedBytes: z.number().nonnegative(),
  swapUsedBytes: z.number().nonnegative(),
  diskUsedBytes: z.number().nonnegative(),
  temperatureC: z.number().nullable(),
  networkRxBytes: z.number().nonnegative().nullable(),
  networkTxBytes: z.number().nonnegative().nullable(),
  processCount: z.number().int().nonnegative().nullable(),
  metadata: metadataSchema,
});

const heartbeatSchema = z.object({
  observedAt: z.iso.datetime().optional(),
  capacity: capacitySchema.partial().optional(),
  metric: metricSchema,
  services: z.array(z.object({
    id: z.string().min(1).max(300),
    name: z.string().min(1).max(200),
    kind: z.string().min(1).max(100),
    endpoint: z.string().max(2_000).nullable(),
    status: z.enum(INFRASTRUCTURE_SERVICE_STATUSES),
    lastCheckedAt: z.iso.datetime().optional(),
    metadata: metadataSchema,
  })).max(500).optional(),
  metadata: metadataSchema.optional(),
});

const scheduleSchema = z.object({
  workloadId: z.string().min(1).max(300),
  requiredCapabilities: z.array(z.string().min(1).max(150)).max(100).default([]),
  preferredLabels: z.array(z.string().min(1).max(100)).max(100).default([]),
  minimumCpuCores: z.number().nonnegative().default(0),
  minimumFreeMemoryBytes: z.number().nonnegative().default(0),
  minimumFreeDiskBytes: z.number().nonnegative().default(0),
  minimumGpuMemoryBytes: z.number().nonnegative().default(0),
  allowDegraded: z.boolean().default(false),
  priority: z.number().int().min(0).max(100).default(50),
});

const actionSchema = z.object({
  nodeId: z.string().min(1).max(200),
  incidentId: z.string().uuid().optional(),
  kind: z.enum(INFRASTRUCTURE_ACTION_KINDS),
  target: z.string().min(1).max(500),
  parameters: metadataSchema.optional(),
  dryRun: z.boolean().optional(),
  requestedBy: z.string().min(1).max(200),
  idempotencyKey: z.string().min(8).max(300).optional(),
});

const approvalSchema = z.object({
  approvedBy: z.string().min(1).max(200),
  scope: z.string().min(3).max(2_000),
});

const rejectionSchema = z.object({
  rejectedBy: z.string().min(1).max(200),
  reason: z.string().min(3).max(2_000),
});

const incidentSchema = z.object({
  title: z.string().min(1).max(300),
  severity: z.enum(INFRASTRUCTURE_ALERT_SEVERITIES),
  nodeIds: z.array(z.string().min(1).max(200)).max(100).optional(),
  alertIds: z.array(z.string().uuid()).max(500).optional(),
  summary: z.string().min(1).max(10_000),
  metadata: metadataSchema.optional(),
});

const incidentUpdateSchema = z.object({
  status: z.enum(INFRASTRUCTURE_INCIDENT_STATUSES).optional(),
  rootCause: z.string().max(20_000).optional(),
  resolution: z.string().max(20_000).optional(),
  summary: z.string().min(1).max(10_000).optional(),
  actor: z.string().min(1).max(200),
});

const backupSchema = z.object({
  id: z.string().min(1).max(300).optional(),
  nodeId: z.string().min(1).max(200),
  name: z.string().min(1).max(300),
  source: z.string().min(1).max(2_000),
  repository: z.string().min(1).max(2_000),
  status: z.enum(INFRASTRUCTURE_BACKUP_STATUSES).optional(),
  lastSuccessfulAt: z.iso.datetime().optional(),
  restorePoint: z.string().max(2_000).optional(),
  metadata: metadataSchema.optional(),
});

const verificationSchema = z.object({
  success: z.boolean(),
  method: z.string().min(1).max(300),
  detail: z.string().min(1).max(10_000),
  performedBy: z.string().min(1).max(200),
  metadata: metadataSchema.optional(),
});

const alertResolveSchema = z.object({
  resolvedBy: z.string().min(1).max(200),
  note: z.string().max(5_000).optional(),
});

const agentAuthorized = (request: FastifyRequest, token: string): boolean => {
  const supplied = request.headers["x-jarvis-agent-token"];
  return typeof supplied === "string" && supplied.length > 0 && supplied === token;
};

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : "Unknown infrastructure error";

export const registerInfrastructureRoutes = (
  app: FastifyInstance,
  service: InfrastructureService,
  agentToken: string,
): void => {
  app.post("/v1/infrastructure/nodes", async (request, reply) => {
    if (!agentAuthorized(request, agentToken)) return reply.code(401).send({ error: "Invalid infrastructure agent token" });
    const parsed = nodeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid node registration", detail: parsed.error.flatten() });
    const data = parsed.data;
    const input: RegisterInfrastructureNodeInput = {
      name: data.name,
      hostname: data.hostname,
      platform: data.platform,
      architecture: data.architecture,
      role: data.role,
      agentVersion: data.agentVersion,
      capacity: data.capacity,
    };
    if (data.id !== undefined) input.id = data.id;
    if (data.labels !== undefined) input.labels = data.labels;
    if (data.capabilities !== undefined) input.capabilities = data.capabilities;
    if (data.metadata !== undefined) input.metadata = data.metadata;
    try {
      return reply.code(201).send({ node: await service.registerNode(input) });
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.post("/v1/infrastructure/nodes/:id/heartbeat", async (request, reply) => {
    if (!agentAuthorized(request, agentToken)) return reply.code(401).send({ error: "Invalid infrastructure agent token" });
    const parsed = heartbeatSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid heartbeat", detail: parsed.error.flatten() });
    const { id } = request.params as { id: string };
    const data = parsed.data;
    const heartbeat: Parameters<InfrastructureService["heartbeat"]>[1] = { metric: data.metric };
    if (data.observedAt !== undefined) heartbeat.observedAt = data.observedAt;
    if (data.capacity !== undefined) heartbeat.capacity = data.capacity;
    if (data.services !== undefined) heartbeat.services = data.services;
    if (data.metadata !== undefined) heartbeat.metadata = data.metadata;
    try {
      return { node: await service.heartbeat(id, heartbeat) };
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.get("/v1/infrastructure/nodes", async () => ({ nodes: await service.listNodes() }));

  app.get("/v1/infrastructure/nodes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return { node: await service.getNodeView(id) };
    } catch (error) {
      return reply.code(404).send({ error: errorMessage(error) });
    }
  });

  app.get("/v1/infrastructure/nodes/:id/metrics", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = z.object({ limit: z.coerce.number().int().min(1).max(2_000).default(100) }).safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "Invalid metrics query" });
    try {
      return { metrics: await service.listMetrics(id, query.data.limit) };
    } catch (error) {
      return reply.code(404).send({ error: errorMessage(error) });
    }
  });

  app.get("/v1/infrastructure/fleet", async () => ({ fleet: await service.fleetSnapshot() }));

  app.post("/v1/infrastructure/schedule", async (request, reply) => {
    const parsed = scheduleSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid scheduling request", detail: parsed.error.flatten() });
    try {
      return { decision: await service.schedule(parsed.data) };
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.post("/v1/infrastructure/actions", async (request, reply) => {
    const parsed = actionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid infrastructure action", detail: parsed.error.flatten() });
    const data = parsed.data;
    const input: RequestInfrastructureActionInput = {
      nodeId: data.nodeId,
      kind: data.kind,
      target: data.target,
      requestedBy: data.requestedBy,
    };
    if (data.incidentId !== undefined) input.incidentId = data.incidentId;
    if (data.parameters !== undefined) input.parameters = data.parameters;
    if (data.dryRun !== undefined) input.dryRun = data.dryRun;
    if (data.idempotencyKey !== undefined) input.idempotencyKey = data.idempotencyKey;
    try {
      return reply.code(201).send({ action: await service.requestAction(input) });
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.get("/v1/infrastructure/actions", async (request, reply) => {
    const parsed = z.object({
      nodeId: z.string().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(1_000).default(200),
    }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid action query" });
    return { actions: await service.listActions(parsed.data.nodeId, parsed.data.limit) };
  });

  app.post("/v1/infrastructure/actions/:id/approve", async (request, reply) => {
    const parsed = approvalSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid action approval", detail: parsed.error.flatten() });
    const { id } = request.params as { id: string };
    try {
      return { action: await service.approveAction(id, parsed.data.approvedBy, parsed.data.scope) };
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.post("/v1/infrastructure/actions/:id/reject", async (request, reply) => {
    const parsed = rejectionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid action rejection", detail: parsed.error.flatten() });
    const { id } = request.params as { id: string };
    try {
      return { action: await service.rejectAction(id, parsed.data.rejectedBy, parsed.data.reason) };
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.post("/v1/infrastructure/actions/:id/execute", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return { action: await service.executeAction(id) };
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.get("/v1/infrastructure/alerts", async (request, reply) => {
    const parsed = z.object({
      nodeId: z.string().min(1).optional(),
      status: z.enum(INFRASTRUCTURE_ALERT_STATUSES).optional(),
    }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid alert query" });
    return { alerts: await service.listAlerts(parsed.data.nodeId, parsed.data.status) };
  });

  app.post("/v1/infrastructure/alerts/:id/resolve", async (request, reply) => {
    const parsed = alertResolveSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid alert resolution", detail: parsed.error.flatten() });
    const { id } = request.params as { id: string };
    try {
      return { alert: await service.resolveAlert(id, parsed.data.resolvedBy, parsed.data.note) };
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.post("/v1/infrastructure/incidents", async (request, reply) => {
    const parsed = incidentSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid incident", detail: parsed.error.flatten() });
    const data = parsed.data;
    const input: CreateInfrastructureIncidentInput = {
      title: data.title,
      severity: data.severity,
      summary: data.summary,
    };
    if (data.nodeIds !== undefined) input.nodeIds = data.nodeIds;
    if (data.alertIds !== undefined) input.alertIds = data.alertIds;
    if (data.metadata !== undefined) input.metadata = data.metadata;
    try {
      return reply.code(201).send({ incident: await service.createIncident(input) });
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.get("/v1/infrastructure/incidents", async (request, reply) => {
    const parsed = z.object({ status: z.enum(INFRASTRUCTURE_INCIDENT_STATUSES).optional() }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid incident query" });
    return { incidents: await service.listIncidents(parsed.data.status) };
  });

  app.get("/v1/infrastructure/incidents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await service.getIncident(id);
    if (!incident) return reply.code(404).send({ error: "Infrastructure incident not found" });
    return {
      incident,
      timeline: await service.listEvents({ incidentId: id, limit: 500 }),
    };
  });

  app.patch("/v1/infrastructure/incidents/:id", async (request, reply) => {
    const parsed = incidentUpdateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid incident update", detail: parsed.error.flatten() });
    const { id } = request.params as { id: string };
    const data = parsed.data;
    const input: Parameters<InfrastructureService["updateIncident"]>[1] = { actor: data.actor };
    if (data.status !== undefined) input.status = data.status;
    if (data.rootCause !== undefined) input.rootCause = data.rootCause;
    if (data.resolution !== undefined) input.resolution = data.resolution;
    if (data.summary !== undefined) input.summary = data.summary;
    try {
      return { incident: await service.updateIncident(id, input) };
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.post("/v1/infrastructure/backups", async (request, reply) => {
    const parsed = backupSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid backup record", detail: parsed.error.flatten() });
    const data = parsed.data;
    const input: UpsertInfrastructureBackupInput = {
      nodeId: data.nodeId,
      name: data.name,
      source: data.source,
      repository: data.repository,
    };
    if (data.id !== undefined) input.id = data.id;
    if (data.status !== undefined) input.status = data.status;
    if (data.lastSuccessfulAt !== undefined) input.lastSuccessfulAt = data.lastSuccessfulAt;
    if (data.restorePoint !== undefined) input.restorePoint = data.restorePoint;
    if (data.metadata !== undefined) input.metadata = data.metadata;
    try {
      return reply.code(201).send({ backup: await service.upsertBackup(input) });
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.get("/v1/infrastructure/backups", async (request, reply) => {
    const parsed = z.object({ nodeId: z.string().min(1).optional() }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid backup query" });
    return { backups: await service.listBackups(parsed.data.nodeId) };
  });

  app.post("/v1/infrastructure/backups/:id/verifications", async (request, reply) => {
    const parsed = verificationSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid backup verification", detail: parsed.error.flatten() });
    const { id } = request.params as { id: string };
    const data = parsed.data;
    const input: Parameters<InfrastructureService["recordBackupVerification"]>[1] = {
      success: data.success,
      method: data.method,
      detail: data.detail,
      performedBy: data.performedBy,
    };
    if (data.metadata !== undefined) input.metadata = data.metadata;
    try {
      return reply.code(201).send(await service.recordBackupVerification(id, input));
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.get("/v1/infrastructure/backups/:id/verifications", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return { verifications: await service.listBackupVerifications(id) };
    } catch (error) {
      return reply.code(404).send({ error: errorMessage(error) });
    }
  });

  app.get("/v1/infrastructure/events", async (request, reply) => {
    const parsed = z.object({
      nodeId: z.string().min(1).optional(),
      actionId: z.string().uuid().optional(),
      incidentId: z.string().uuid().optional(),
      limit: z.coerce.number().int().min(1).max(2_000).default(500),
    }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid event query" });
    const data = parsed.data;
    const options: Parameters<InfrastructureService["listEvents"]>[0] = { limit: data.limit };
    if (data.nodeId !== undefined) options.nodeId = data.nodeId;
    if (data.actionId !== undefined) options.actionId = data.actionId;
    if (data.incidentId !== undefined) options.incidentId = data.incidentId;
    return { events: await service.listEvents(options) };
  });
};
