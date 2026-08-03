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

export interface InfrastructureRepository {
  saveNode(node: InfrastructureNode): Promise<void>;
  getNode(id: string): Promise<InfrastructureNode | null>;
  listNodes(): Promise<InfrastructureNode[]>;

  saveMetric(sample: InfrastructureMetricSample): Promise<void>;
  latestMetric(nodeId: string): Promise<InfrastructureMetricSample | null>;
  listMetrics(nodeId: string, limit?: number): Promise<InfrastructureMetricSample[]>;

  saveService(service: InfrastructureServiceRecord): Promise<void>;
  getService(id: string): Promise<InfrastructureServiceRecord | null>;
  listServices(nodeId?: string): Promise<InfrastructureServiceRecord[]>;

  saveAlert(alert: InfrastructureAlert): Promise<void>;
  getAlert(id: string): Promise<InfrastructureAlert | null>;
  listAlerts(options?: {
    nodeId?: string;
    status?: InfrastructureAlertStatus;
    limit?: number;
  }): Promise<InfrastructureAlert[]>;

  saveAction(action: InfrastructureActionRequest): Promise<void>;
  getAction(id: string): Promise<InfrastructureActionRequest | null>;
  getActionByIdempotencyKey(key: string): Promise<InfrastructureActionRequest | null>;
  listActions(options?: { nodeId?: string; limit?: number }): Promise<InfrastructureActionRequest[]>;

  saveIncident(incident: InfrastructureIncident): Promise<void>;
  getIncident(id: string): Promise<InfrastructureIncident | null>;
  listIncidents(options?: {
    status?: InfrastructureIncidentStatus;
    limit?: number;
  }): Promise<InfrastructureIncident[]>;

  saveBackup(backup: InfrastructureBackupRecord): Promise<void>;
  getBackup(id: string): Promise<InfrastructureBackupRecord | null>;
  listBackups(nodeId?: string): Promise<InfrastructureBackupRecord[]>;
  saveBackupVerification(verification: InfrastructureBackupVerification): Promise<void>;
  listBackupVerifications(backupId: string, limit?: number): Promise<InfrastructureBackupVerification[]>;

  appendEvent(event: InfrastructureEvent): Promise<void>;
  listEvents(options?: {
    nodeId?: string;
    actionId?: string;
    incidentId?: string;
    limit?: number;
  }): Promise<InfrastructureEvent[]>;
}
