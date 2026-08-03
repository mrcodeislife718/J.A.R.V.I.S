import type { Pool, QueryResultRow } from "pg";
import type { InfrastructureRepository } from "./repository.js";
import type {
  InfrastructureActionRequest,
  InfrastructureAlert,
  InfrastructureAlertStatus,
  InfrastructureBackupRecord,
  InfrastructureBackupVerification,
  InfrastructureEvent,
  InfrastructureIncident,
  InfrastructureIncidentStatus,
  InfrastructureMetricSample,
  InfrastructureNode,
  InfrastructureServiceRecord,
} from "./types.js";

const iso = (value: string | Date): string => new Date(value).toISOString();
const nullableIso = (value: string | Date | null): string | null => value === null ? null : iso(value);
const numberOrNull = (value: number | string | null): number | null => value === null ? null : Number(value);

interface NodeRow extends QueryResultRow {
  id: string;
  name: string;
  hostname: string;
  platform: InfrastructureNode["platform"];
  architecture: string;
  role: InfrastructureNode["role"];
  status: InfrastructureNode["status"];
  labels: string[];
  capabilities: string[];
  agent_version: string;
  capacity: InfrastructureNode["capacity"];
  metadata: Record<string, unknown>;
  registered_at: string | Date;
  last_seen_at: string | Date;
}

interface MetricRow extends QueryResultRow {
  id: string;
  node_id: string;
  observed_at: string | Date;
  cpu_utilization: number | string;
  load1: number | string;
  memory_used_bytes: number | string;
  swap_used_bytes: number | string;
  disk_used_bytes: number | string;
  temperature_c: number | string | null;
  network_rx_bytes: number | string | null;
  network_tx_bytes: number | string | null;
  process_count: number | null;
  metadata: Record<string, unknown>;
}

interface ServiceRow extends QueryResultRow {
  id: string;
  node_id: string;
  name: string;
  kind: string;
  endpoint: string | null;
  status: InfrastructureServiceRecord["status"];
  last_checked_at: string | Date;
  metadata: Record<string, unknown>;
}

interface AlertRow extends QueryResultRow {
  id: string;
  node_id: string;
  kind: string;
  severity: InfrastructureAlert["severity"];
  status: InfrastructureAlert["status"];
  dedupe_key: string;
  summary: string;
  detail: Record<string, unknown>;
  opened_at: string | Date;
  updated_at: string | Date;
  resolved_at: string | Date | null;
  resolved_by: string | null;
}

interface ActionRow extends QueryResultRow {
  id: string;
  node_id: string;
  incident_id: string | null;
  kind: InfrastructureActionRequest["kind"];
  target: string;
  parameters: Record<string, unknown>;
  risk: InfrastructureActionRequest["risk"];
  status: InfrastructureActionRequest["status"];
  dry_run: boolean;
  requested_by: string;
  approved_by: string | null;
  approved_at: string | Date | null;
  approval_scope: string | null;
  executed_at: string | Date | null;
  result: Record<string, unknown> | null;
  idempotency_key: string;
  created_at: string | Date;
  updated_at: string | Date;
}

interface IncidentRow extends QueryResultRow {
  id: string;
  title: string;
  severity: InfrastructureIncident["severity"];
  status: InfrastructureIncident["status"];
  node_ids: string[];
  alert_ids: string[];
  summary: string;
  root_cause: string | null;
  resolution: string | null;
  opened_at: string | Date;
  updated_at: string | Date;
  resolved_at: string | Date | null;
  metadata: Record<string, unknown>;
}

interface BackupRow extends QueryResultRow {
  id: string;
  node_id: string;
  name: string;
  source: string;
  repository: string;
  status: InfrastructureBackupRecord["status"];
  last_successful_at: string | Date | null;
  last_verified_at: string | Date | null;
  verification_method: string | null;
  restore_point: string | null;
  metadata: Record<string, unknown>;
  created_at: string | Date;
  updated_at: string | Date;
}

interface VerificationRow extends QueryResultRow {
  id: string;
  backup_id: string;
  verified_at: string | Date;
  success: boolean;
  method: string;
  detail: string;
  performed_by: string;
  metadata: Record<string, unknown>;
}

interface EventRow extends QueryResultRow {
  id: string;
  node_id: string | null;
  action_id: string | null;
  incident_id: string | null;
  type: string;
  actor: string;
  summary: string;
  occurred_at: string | Date;
  metadata: Record<string, unknown>;
}

const mapNode = (row: NodeRow): InfrastructureNode => ({
  id: row.id,
  name: row.name,
  hostname: row.hostname,
  platform: row.platform,
  architecture: row.architecture,
  role: row.role,
  status: row.status,
  labels: row.labels,
  capabilities: row.capabilities,
  agentVersion: row.agent_version,
  capacity: row.capacity,
  metadata: row.metadata,
  registeredAt: iso(row.registered_at),
  lastSeenAt: iso(row.last_seen_at),
});

const mapMetric = (row: MetricRow): InfrastructureMetricSample => ({
  id: row.id,
  nodeId: row.node_id,
  observedAt: iso(row.observed_at),
  cpuUtilization: Number(row.cpu_utilization),
  load1: Number(row.load1),
  memoryUsedBytes: Number(row.memory_used_bytes),
  swapUsedBytes: Number(row.swap_used_bytes),
  diskUsedBytes: Number(row.disk_used_bytes),
  temperatureC: numberOrNull(row.temperature_c),
  networkRxBytes: numberOrNull(row.network_rx_bytes),
  networkTxBytes: numberOrNull(row.network_tx_bytes),
  processCount: row.process_count,
  metadata: row.metadata,
});

const mapService = (row: ServiceRow): InfrastructureServiceRecord => ({
  id: row.id,
  nodeId: row.node_id,
  name: row.name,
  kind: row.kind,
  endpoint: row.endpoint,
  status: row.status,
  lastCheckedAt: iso(row.last_checked_at),
  metadata: row.metadata,
});

const mapAlert = (row: AlertRow): InfrastructureAlert => ({
  id: row.id,
  nodeId: row.node_id,
  kind: row.kind,
  severity: row.severity,
  status: row.status,
  dedupeKey: row.dedupe_key,
  summary: row.summary,
  detail: row.detail,
  openedAt: iso(row.opened_at),
  updatedAt: iso(row.updated_at),
  resolvedAt: nullableIso(row.resolved_at),
  resolvedBy: row.resolved_by,
});

const mapAction = (row: ActionRow): InfrastructureActionRequest => ({
  id: row.id,
  nodeId: row.node_id,
  incidentId: row.incident_id,
  kind: row.kind,
  target: row.target,
  parameters: row.parameters,
  risk: row.risk,
  status: row.status,
  dryRun: row.dry_run,
  requestedBy: row.requested_by,
  approvedBy: row.approved_by,
  approvedAt: nullableIso(row.approved_at),
  approvalScope: row.approval_scope,
  executedAt: nullableIso(row.executed_at),
  result: row.result,
  idempotencyKey: row.idempotency_key,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

const mapIncident = (row: IncidentRow): InfrastructureIncident => ({
  id: row.id,
  title: row.title,
  severity: row.severity,
  status: row.status,
  nodeIds: row.node_ids,
  alertIds: row.alert_ids,
  summary: row.summary,
  rootCause: row.root_cause,
  resolution: row.resolution,
  openedAt: iso(row.opened_at),
  updatedAt: iso(row.updated_at),
  resolvedAt: nullableIso(row.resolved_at),
  metadata: row.metadata,
});

const mapBackup = (row: BackupRow): InfrastructureBackupRecord => ({
  id: row.id,
  nodeId: row.node_id,
  name: row.name,
  source: row.source,
  repository: row.repository,
  status: row.status,
  lastSuccessfulAt: nullableIso(row.last_successful_at),
  lastVerifiedAt: nullableIso(row.last_verified_at),
  verificationMethod: row.verification_method,
  restorePoint: row.restore_point,
  metadata: row.metadata,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

const mapVerification = (row: VerificationRow): InfrastructureBackupVerification => ({
  id: row.id,
  backupId: row.backup_id,
  verifiedAt: iso(row.verified_at),
  success: row.success,
  method: row.method,
  detail: row.detail,
  performedBy: row.performed_by,
  metadata: row.metadata,
});

const mapEvent = (row: EventRow): InfrastructureEvent => ({
  id: row.id,
  nodeId: row.node_id,
  actionId: row.action_id,
  incidentId: row.incident_id,
  type: row.type,
  actor: row.actor,
  summary: row.summary,
  occurredAt: iso(row.occurred_at),
  metadata: row.metadata,
});

export class PostgresInfrastructureRepository implements InfrastructureRepository {
  constructor(private readonly pool: Pool) {}

  async saveNode(node: InfrastructureNode): Promise<void> {
    await this.pool.query(
      `INSERT INTO infra_nodes
       (id,name,hostname,platform,architecture,role,status,labels,capabilities,agent_version,capacity,metadata,registered_at,last_seen_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, hostname=EXCLUDED.hostname, platform=EXCLUDED.platform,
         architecture=EXCLUDED.architecture, role=EXCLUDED.role, status=EXCLUDED.status,
         labels=EXCLUDED.labels, capabilities=EXCLUDED.capabilities,
         agent_version=EXCLUDED.agent_version, capacity=EXCLUDED.capacity,
         metadata=EXCLUDED.metadata, last_seen_at=EXCLUDED.last_seen_at`,
      [
        node.id,node.name,node.hostname,node.platform,node.architecture,node.role,node.status,
        node.labels,node.capabilities,node.agentVersion,node.capacity,node.metadata,node.registeredAt,node.lastSeenAt,
      ],
    );
  }

  async getNode(id: string): Promise<InfrastructureNode | null> {
    const result = await this.pool.query<NodeRow>("SELECT * FROM infra_nodes WHERE id=$1", [id]);
    const row = result.rows[0];
    return row ? mapNode(row) : null;
  }

  async listNodes(): Promise<InfrastructureNode[]> {
    const result = await this.pool.query<NodeRow>("SELECT * FROM infra_nodes ORDER BY name");
    return result.rows.map(mapNode);
  }

  async saveMetric(sample: InfrastructureMetricSample): Promise<void> {
    await this.pool.query(
      `INSERT INTO infra_metrics
       (id,node_id,observed_at,cpu_utilization,load1,memory_used_bytes,swap_used_bytes,disk_used_bytes,
        temperature_c,network_rx_bytes,network_tx_bytes,process_count,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        sample.id,sample.nodeId,sample.observedAt,sample.cpuUtilization,sample.load1,
        sample.memoryUsedBytes,sample.swapUsedBytes,sample.diskUsedBytes,sample.temperatureC,
        sample.networkRxBytes,sample.networkTxBytes,sample.processCount,sample.metadata,
      ],
    );
  }

  async latestMetric(nodeId: string): Promise<InfrastructureMetricSample | null> {
    const result = await this.pool.query<MetricRow>(
      "SELECT * FROM infra_metrics WHERE node_id=$1 ORDER BY observed_at DESC LIMIT 1",
      [nodeId],
    );
    const row = result.rows[0];
    return row ? mapMetric(row) : null;
  }

  async listMetrics(nodeId: string, limit = 100): Promise<InfrastructureMetricSample[]> {
    const result = await this.pool.query<MetricRow>(
      "SELECT * FROM infra_metrics WHERE node_id=$1 ORDER BY observed_at DESC LIMIT $2",
      [nodeId, limit],
    );
    return result.rows.map(mapMetric);
  }

  async saveService(service: InfrastructureServiceRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO infra_services (id,node_id,name,kind,endpoint,status,last_checked_at,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         node_id=EXCLUDED.node_id, name=EXCLUDED.name, kind=EXCLUDED.kind,
         endpoint=EXCLUDED.endpoint, status=EXCLUDED.status,
         last_checked_at=EXCLUDED.last_checked_at, metadata=EXCLUDED.metadata`,
      [service.id,service.nodeId,service.name,service.kind,service.endpoint,service.status,service.lastCheckedAt,service.metadata],
    );
  }

  async getService(id: string): Promise<InfrastructureServiceRecord | null> {
    const result = await this.pool.query<ServiceRow>("SELECT * FROM infra_services WHERE id=$1", [id]);
    const row = result.rows[0];
    return row ? mapService(row) : null;
  }

  async listServices(nodeId?: string): Promise<InfrastructureServiceRecord[]> {
    const result = nodeId
      ? await this.pool.query<ServiceRow>("SELECT * FROM infra_services WHERE node_id=$1 ORDER BY name", [nodeId])
      : await this.pool.query<ServiceRow>("SELECT * FROM infra_services ORDER BY node_id,name");
    return result.rows.map(mapService);
  }

  async saveAlert(alert: InfrastructureAlert): Promise<void> {
    await this.pool.query(
      `INSERT INTO infra_alerts
       (id,node_id,kind,severity,status,dedupe_key,summary,detail,opened_at,updated_at,resolved_at,resolved_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         severity=EXCLUDED.severity, status=EXCLUDED.status, summary=EXCLUDED.summary,
         detail=EXCLUDED.detail, updated_at=EXCLUDED.updated_at,
         resolved_at=EXCLUDED.resolved_at, resolved_by=EXCLUDED.resolved_by`,
      [
        alert.id,alert.nodeId,alert.kind,alert.severity,alert.status,alert.dedupeKey,
        alert.summary,alert.detail,alert.openedAt,alert.updatedAt,alert.resolvedAt,alert.resolvedBy,
      ],
    );
  }

  async getAlert(id: string): Promise<InfrastructureAlert | null> {
    const result = await this.pool.query<AlertRow>("SELECT * FROM infra_alerts WHERE id=$1", [id]);
    const row = result.rows[0];
    return row ? mapAlert(row) : null;
  }

  async listAlerts(options: { nodeId?: string; status?: InfrastructureAlertStatus; limit?: number } = {}): Promise<InfrastructureAlert[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.nodeId) {
      values.push(options.nodeId);
      conditions.push(`node_id=$${values.length}`);
    }
    if (options.status) {
      values.push(options.status);
      conditions.push(`status=$${values.length}`);
    }
    values.push(options.limit ?? 200);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.pool.query<AlertRow>(
      `SELECT * FROM infra_alerts ${where} ORDER BY opened_at DESC LIMIT $${values.length}`,
      values,
    );
    return result.rows.map(mapAlert);
  }

  async saveAction(action: InfrastructureActionRequest): Promise<void> {
    await this.pool.query(
      `INSERT INTO infra_actions
       (id,node_id,incident_id,kind,target,parameters,risk,status,dry_run,requested_by,approved_by,
        approved_at,approval_scope,executed_at,result,idempotency_key,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO UPDATE SET
         incident_id=EXCLUDED.incident_id, status=EXCLUDED.status, approved_by=EXCLUDED.approved_by,
         approved_at=EXCLUDED.approved_at, approval_scope=EXCLUDED.approval_scope,
         executed_at=EXCLUDED.executed_at, result=EXCLUDED.result, updated_at=EXCLUDED.updated_at`,
      [
        action.id,action.nodeId,action.incidentId,action.kind,action.target,action.parameters,
        action.risk,action.status,action.dryRun,action.requestedBy,action.approvedBy,action.approvedAt,
        action.approvalScope,action.executedAt,action.result,action.idempotencyKey,action.createdAt,action.updatedAt,
      ],
    );
  }

  async getAction(id: string): Promise<InfrastructureActionRequest | null> {
    const result = await this.pool.query<ActionRow>("SELECT * FROM infra_actions WHERE id=$1", [id]);
    const row = result.rows[0];
    return row ? mapAction(row) : null;
  }

  async getActionByIdempotencyKey(key: string): Promise<InfrastructureActionRequest | null> {
    const result = await this.pool.query<ActionRow>("SELECT * FROM infra_actions WHERE idempotency_key=$1", [key]);
    const row = result.rows[0];
    return row ? mapAction(row) : null;
  }

  async listActions(options: { nodeId?: string; limit?: number } = {}): Promise<InfrastructureActionRequest[]> {
    const result = options.nodeId
      ? await this.pool.query<ActionRow>(
          "SELECT * FROM infra_actions WHERE node_id=$1 ORDER BY created_at DESC LIMIT $2",
          [options.nodeId, options.limit ?? 200],
        )
      : await this.pool.query<ActionRow>(
          "SELECT * FROM infra_actions ORDER BY created_at DESC LIMIT $1",
          [options.limit ?? 200],
        );
    return result.rows.map(mapAction);
  }

  async saveIncident(incident: InfrastructureIncident): Promise<void> {
    await this.pool.query(
      `INSERT INTO infra_incidents
       (id,title,severity,status,node_ids,alert_ids,summary,root_cause,resolution,opened_at,updated_at,resolved_at,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         title=EXCLUDED.title, severity=EXCLUDED.severity, status=EXCLUDED.status,
         node_ids=EXCLUDED.node_ids, alert_ids=EXCLUDED.alert_ids, summary=EXCLUDED.summary,
         root_cause=EXCLUDED.root_cause, resolution=EXCLUDED.resolution,
         updated_at=EXCLUDED.updated_at, resolved_at=EXCLUDED.resolved_at, metadata=EXCLUDED.metadata`,
      [
        incident.id,incident.title,incident.severity,incident.status,incident.nodeIds,incident.alertIds,
        incident.summary,incident.rootCause,incident.resolution,incident.openedAt,incident.updatedAt,
        incident.resolvedAt,incident.metadata,
      ],
    );
  }

  async getIncident(id: string): Promise<InfrastructureIncident | null> {
    const result = await this.pool.query<IncidentRow>("SELECT * FROM infra_incidents WHERE id=$1", [id]);
    const row = result.rows[0];
    return row ? mapIncident(row) : null;
  }

  async listIncidents(options: { status?: InfrastructureIncidentStatus; limit?: number } = {}): Promise<InfrastructureIncident[]> {
    const result = options.status
      ? await this.pool.query<IncidentRow>(
          "SELECT * FROM infra_incidents WHERE status=$1 ORDER BY opened_at DESC LIMIT $2",
          [options.status, options.limit ?? 200],
        )
      : await this.pool.query<IncidentRow>(
          "SELECT * FROM infra_incidents ORDER BY opened_at DESC LIMIT $1",
          [options.limit ?? 200],
        );
    return result.rows.map(mapIncident);
  }

  async saveBackup(backup: InfrastructureBackupRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO infra_backups
       (id,node_id,name,source,repository,status,last_successful_at,last_verified_at,verification_method,
        restore_point,metadata,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         node_id=EXCLUDED.node_id, name=EXCLUDED.name, source=EXCLUDED.source,
         repository=EXCLUDED.repository, status=EXCLUDED.status,
         last_successful_at=EXCLUDED.last_successful_at, last_verified_at=EXCLUDED.last_verified_at,
         verification_method=EXCLUDED.verification_method, restore_point=EXCLUDED.restore_point,
         metadata=EXCLUDED.metadata, updated_at=EXCLUDED.updated_at`,
      [
        backup.id,backup.nodeId,backup.name,backup.source,backup.repository,backup.status,
        backup.lastSuccessfulAt,backup.lastVerifiedAt,backup.verificationMethod,backup.restorePoint,
        backup.metadata,backup.createdAt,backup.updatedAt,
      ],
    );
  }

  async getBackup(id: string): Promise<InfrastructureBackupRecord | null> {
    const result = await this.pool.query<BackupRow>("SELECT * FROM infra_backups WHERE id=$1", [id]);
    const row = result.rows[0];
    return row ? mapBackup(row) : null;
  }

  async listBackups(nodeId?: string): Promise<InfrastructureBackupRecord[]> {
    const result = nodeId
      ? await this.pool.query<BackupRow>("SELECT * FROM infra_backups WHERE node_id=$1 ORDER BY name", [nodeId])
      : await this.pool.query<BackupRow>("SELECT * FROM infra_backups ORDER BY node_id,name");
    return result.rows.map(mapBackup);
  }

  async saveBackupVerification(verification: InfrastructureBackupVerification): Promise<void> {
    await this.pool.query(
      `INSERT INTO infra_backup_verifications
       (id,backup_id,verified_at,success,method,detail,performed_by,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        verification.id,verification.backupId,verification.verifiedAt,verification.success,
        verification.method,verification.detail,verification.performedBy,verification.metadata,
      ],
    );
  }

  async listBackupVerifications(backupId: string, limit = 100): Promise<InfrastructureBackupVerification[]> {
    const result = await this.pool.query<VerificationRow>(
      "SELECT * FROM infra_backup_verifications WHERE backup_id=$1 ORDER BY verified_at DESC LIMIT $2",
      [backupId, limit],
    );
    return result.rows.map(mapVerification);
  }

  async appendEvent(event: InfrastructureEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO infra_events
       (id,node_id,action_id,incident_id,type,actor,summary,occurred_at,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        event.id,event.nodeId,event.actionId,event.incidentId,event.type,event.actor,
        event.summary,event.occurredAt,event.metadata,
      ],
    );
  }

  async listEvents(options: {
    nodeId?: string;
    actionId?: string;
    incidentId?: string;
    limit?: number;
  } = {}): Promise<InfrastructureEvent[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.nodeId) {
      values.push(options.nodeId);
      conditions.push(`node_id=$${values.length}`);
    }
    if (options.actionId) {
      values.push(options.actionId);
      conditions.push(`action_id=$${values.length}`);
    }
    if (options.incidentId) {
      values.push(options.incidentId);
      conditions.push(`incident_id=$${values.length}`);
    }
    values.push(options.limit ?? 500);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.pool.query<EventRow>(
      `SELECT * FROM infra_events ${where} ORDER BY occurred_at DESC LIMIT $${values.length}`,
      values,
    );
    return result.rows.map(mapEvent);
  }
}
