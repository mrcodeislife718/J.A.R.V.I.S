import type { InfrastructureRepository } from "./repository.js";
import type {
  InfrastructureActionRequest,
  InfrastructureAlert,
  InfrastructureBackupRecord,
  InfrastructureBackupVerification,
  InfrastructureEvent,
  InfrastructureIncident,
  InfrastructureMetricSample,
  InfrastructureNode,
  InfrastructureServiceRecord,
} from "./types.js";

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryInfrastructureRepository implements InfrastructureRepository {
  private readonly nodes = new Map<string, InfrastructureNode>();
  private readonly metrics = new Map<string, InfrastructureMetricSample[]>();
  private readonly services = new Map<string, InfrastructureServiceRecord>();
  private readonly alerts = new Map<string, InfrastructureAlert>();
  private readonly actions = new Map<string, InfrastructureActionRequest>();
  private readonly incidents = new Map<string, InfrastructureIncident>();
  private readonly backups = new Map<string, InfrastructureBackupRecord>();
  private readonly backupVerifications = new Map<string, InfrastructureBackupVerification[]>();
  private readonly events: InfrastructureEvent[] = [];

  async saveNode(node: InfrastructureNode): Promise<void> {
    this.nodes.set(node.id, clone(node));
  }

  async getNode(id: string): Promise<InfrastructureNode | null> {
    const node = this.nodes.get(id);
    return node ? clone(node) : null;
  }

  async listNodes(): Promise<InfrastructureNode[]> {
    return [...this.nodes.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(clone);
  }

  async saveMetric(sample: InfrastructureMetricSample): Promise<void> {
    const samples = this.metrics.get(sample.nodeId) ?? [];
    samples.push(clone(sample));
    samples.sort((a, b) => b.observedAt.localeCompare(a.observedAt));
    if (samples.length > 2_000) samples.length = 2_000;
    this.metrics.set(sample.nodeId, samples);
  }

  async latestMetric(nodeId: string): Promise<InfrastructureMetricSample | null> {
    const sample = this.metrics.get(nodeId)?.[0];
    return sample ? clone(sample) : null;
  }

  async listMetrics(nodeId: string, limit = 100): Promise<InfrastructureMetricSample[]> {
    return (this.metrics.get(nodeId) ?? []).slice(0, limit).map(clone);
  }

  async saveService(service: InfrastructureServiceRecord): Promise<void> {
    this.services.set(service.id, clone(service));
  }

  async getService(id: string): Promise<InfrastructureServiceRecord | null> {
    const service = this.services.get(id);
    return service ? clone(service) : null;
  }

  async listServices(nodeId?: string): Promise<InfrastructureServiceRecord[]> {
    return [...this.services.values()]
      .filter((service) => !nodeId || service.nodeId === nodeId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(clone);
  }

  async saveAlert(alert: InfrastructureAlert): Promise<void> {
    this.alerts.set(alert.id, clone(alert));
  }

  async getAlert(id: string): Promise<InfrastructureAlert | null> {
    const alert = this.alerts.get(id);
    return alert ? clone(alert) : null;
  }

  async listAlerts(options: { nodeId?: string; status?: InfrastructureAlert["status"]; limit?: number } = {}): Promise<InfrastructureAlert[]> {
    return [...this.alerts.values()]
      .filter((alert) => !options.nodeId || alert.nodeId === options.nodeId)
      .filter((alert) => !options.status || alert.status === options.status)
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
      .slice(0, options.limit ?? 200)
      .map(clone);
  }

  async saveAction(action: InfrastructureActionRequest): Promise<void> {
    this.actions.set(action.id, clone(action));
  }

  async getAction(id: string): Promise<InfrastructureActionRequest | null> {
    const action = this.actions.get(id);
    return action ? clone(action) : null;
  }

  async getActionByIdempotencyKey(key: string): Promise<InfrastructureActionRequest | null> {
    const action = [...this.actions.values()].find((candidate) => candidate.idempotencyKey === key);
    return action ? clone(action) : null;
  }

  async listActions(options: { nodeId?: string; limit?: number } = {}): Promise<InfrastructureActionRequest[]> {
    return [...this.actions.values()]
      .filter((action) => !options.nodeId || action.nodeId === options.nodeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, options.limit ?? 200)
      .map(clone);
  }

  async saveIncident(incident: InfrastructureIncident): Promise<void> {
    this.incidents.set(incident.id, clone(incident));
  }

  async getIncident(id: string): Promise<InfrastructureIncident | null> {
    const incident = this.incidents.get(id);
    return incident ? clone(incident) : null;
  }

  async listIncidents(options: { status?: InfrastructureIncident["status"]; limit?: number } = {}): Promise<InfrastructureIncident[]> {
    return [...this.incidents.values()]
      .filter((incident) => !options.status || incident.status === options.status)
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
      .slice(0, options.limit ?? 200)
      .map(clone);
  }

  async saveBackup(backup: InfrastructureBackupRecord): Promise<void> {
    this.backups.set(backup.id, clone(backup));
  }

  async getBackup(id: string): Promise<InfrastructureBackupRecord | null> {
    const backup = this.backups.get(id);
    return backup ? clone(backup) : null;
  }

  async listBackups(nodeId?: string): Promise<InfrastructureBackupRecord[]> {
    return [...this.backups.values()]
      .filter((backup) => !nodeId || backup.nodeId === nodeId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(clone);
  }

  async saveBackupVerification(verification: InfrastructureBackupVerification): Promise<void> {
    const records = this.backupVerifications.get(verification.backupId) ?? [];
    records.push(clone(verification));
    records.sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt));
    this.backupVerifications.set(verification.backupId, records);
  }

  async listBackupVerifications(backupId: string, limit = 100): Promise<InfrastructureBackupVerification[]> {
    return (this.backupVerifications.get(backupId) ?? []).slice(0, limit).map(clone);
  }

  async appendEvent(event: InfrastructureEvent): Promise<void> {
    this.events.push(clone(event));
  }

  async listEvents(options: {
    nodeId?: string;
    actionId?: string;
    incidentId?: string;
    limit?: number;
  } = {}): Promise<InfrastructureEvent[]> {
    return this.events
      .filter((event) => !options.nodeId || event.nodeId === options.nodeId)
      .filter((event) => !options.actionId || event.actionId === options.actionId)
      .filter((event) => !options.incidentId || event.incidentId === options.incidentId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, options.limit ?? 500)
      .map(clone);
  }
}
