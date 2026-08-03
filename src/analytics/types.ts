export const ANALYTICS_SOURCE_KINDS = [
  "postgres",
  "spreadsheet",
  "csv",
  "json",
  "api",
  "event-stream",
  "manual",
] as const;
export const ANALYTICS_SOURCE_STATUSES = ["active", "disabled"] as const;
export const ANALYTICS_SENSITIVITIES = ["public", "internal", "confidential", "restricted"] as const;
export const ANALYTICS_METRIC_STATUSES = ["candidate", "approved", "rejected", "deprecated"] as const;
export const ANALYTICS_QUERY_STATUSES = ["planned", "running", "succeeded", "failed", "rejected"] as const;
export const ANALYTICS_QUALITY_RULE_KINDS = [
  "not-null",
  "unique",
  "range",
  "accepted-values",
  "freshness",
] as const;
export const ANALYTICS_LINEAGE_NODE_KINDS = [
  "source",
  "dataset",
  "schema",
  "query",
  "metric",
  "quality-run",
  "forecast",
  "report",
] as const;
export const ANALYTICS_REPORT_STATUSES = ["candidate", "approved", "disabled"] as const;

export type AnalyticsSourceKind = (typeof ANALYTICS_SOURCE_KINDS)[number];
export type AnalyticsSourceStatus = (typeof ANALYTICS_SOURCE_STATUSES)[number];
export type AnalyticsSensitivity = (typeof ANALYTICS_SENSITIVITIES)[number];
export type AnalyticsMetricStatus = (typeof ANALYTICS_METRIC_STATUSES)[number];
export type AnalyticsQueryStatus = (typeof ANALYTICS_QUERY_STATUSES)[number];
export type AnalyticsQualityRuleKind = (typeof ANALYTICS_QUALITY_RULE_KINDS)[number];
export type AnalyticsLineageNodeKind = (typeof ANALYTICS_LINEAGE_NODE_KINDS)[number];
export type AnalyticsReportStatus = (typeof ANALYTICS_REPORT_STATUSES)[number];
export type AnalyticsScalar = string | number | boolean | null;
export type AnalyticsRow = Record<string, AnalyticsScalar>;

export interface AnalyticsDataSource {
  id: string;
  name: string;
  description: string | null;
  kind: AnalyticsSourceKind;
  status: AnalyticsSourceStatus;
  sensitivity: AnalyticsSensitivity;
  requiresApproval: boolean;
  endpointLabel: string | null;
  credentialRef: string | null;
  owner: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsColumnSchema {
  name: string;
  dataType: string;
  nullable: boolean;
  primaryKey: boolean;
  description: string | null;
  metadata: Record<string, unknown>;
}

export interface AnalyticsTableSchema {
  namespace: string | null;
  name: string;
  kind: "table" | "view" | "file" | "stream" | "sheet" | "collection";
  columns: AnalyticsColumnSchema[];
  estimatedRows: number | null;
  metadata: Record<string, unknown>;
}

export interface AnalyticsSchemaSnapshot {
  id: string;
  sourceId: string;
  version: number;
  fingerprint: string;
  tables: AnalyticsTableSchema[];
  observedAt: string;
  observedBy: string;
  metadata: Record<string, unknown>;
}

export type AnalyticsMetricCalculation =
  | { type: "count"; column: string | null; distinct: boolean }
  | { type: "sum" | "average" | "minimum" | "maximum"; column: string }
  | { type: "ratio"; numeratorColumn: string; denominatorColumn: string; multiplier: number };

export interface AnalyticsMetricDefinition {
  id: string;
  sourceId: string;
  dataset: string;
  name: string;
  description: string;
  owner: string;
  unit: string | null;
  grain: string;
  dimensions: string[];
  filters: Record<string, AnalyticsScalar>;
  calculation: AnalyticsMetricCalculation;
  status: AnalyticsMetricStatus;
  version: number;
  approvedBy: string | null;
  approvedAt: string | null;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsMetricObservation {
  id: string;
  metricId: string;
  sourceId: string;
  dataset: string;
  value: number;
  rowCount: number;
  inputHash: string;
  dimensions: Record<string, AnalyticsScalar>;
  computedAt: string;
  computedBy: string;
  metadata: Record<string, unknown>;
}

export interface AnalyticsSqlValidation {
  accepted: boolean;
  normalizedSql: string;
  statementType: "select" | "unknown";
  referencedRelations: string[];
  parameterIndexes: number[];
  warnings: string[];
  rejectionReasons: string[];
}

export interface AnalyticsQueryRun {
  id: string;
  sourceId: string;
  requestedBy: string;
  authorizedBy: string | null;
  purpose: string;
  sqlHash: string;
  normalizedSql: string;
  parametersHash: string;
  maxRows: number;
  timeoutMs: number;
  status: AnalyticsQueryStatus;
  referencedRelations: string[];
  resultColumns: string[];
  resultRowCount: number | null;
  resultHash: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface AnalyticsQueryResult {
  columns: string[];
  rows: AnalyticsRow[];
  durationMs: number;
}

export interface AnalyticsQualityRule {
  id: string;
  sourceId: string;
  dataset: string;
  name: string;
  kind: AnalyticsQualityRuleKind;
  column: string;
  configuration: Record<string, unknown>;
  maximumFailureRatio: number;
  active: boolean;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsQualityRuleResult {
  ruleId: string;
  passed: boolean;
  checkedRows: number;
  failedRows: number;
  failureRatio: number;
  examples: Array<{ rowIndex: number; value: AnalyticsScalar; reason: string }>;
}

export interface AnalyticsQualityRun {
  id: string;
  sourceId: string;
  dataset: string;
  rowCount: number;
  inputHash: string;
  passed: boolean;
  results: AnalyticsQualityRuleResult[];
  executedAt: string;
  executedBy: string;
  metadata: Record<string, unknown>;
}

export interface AnalyticsColumnProfile {
  name: string;
  nonNullCount: number;
  nullCount: number;
  distinctCount: number;
  numericMinimum: number | null;
  numericMaximum: number | null;
  numericMean: number | null;
  examples: AnalyticsScalar[];
}

export interface AnalyticsDatasetProfile {
  id: string;
  sourceId: string;
  dataset: string;
  rowCount: number;
  inputHash: string;
  columns: AnalyticsColumnProfile[];
  profiledAt: string;
  profiledBy: string;
  metadata: Record<string, unknown>;
}

export interface AnalyticsLineageEdge {
  id: string;
  fromKind: AnalyticsLineageNodeKind;
  fromId: string;
  toKind: AnalyticsLineageNodeKind;
  toId: string;
  transformation: string;
  evidence: Record<string, unknown>;
  createdAt: string;
}

export interface AnalyticsForecastEvaluation {
  id: string;
  sourceId: string | null;
  dataset: string;
  target: string;
  modelName: string;
  horizon: number;
  sampleCount: number;
  actualHash: string;
  predictedHash: string;
  mae: number;
  rmse: number;
  mape: number | null;
  baselineValue: number;
  baselineMae: number;
  baselineRmse: number;
  beatsBaseline: boolean;
  evaluatedAt: string;
  evaluatedBy: string;
  metadata: Record<string, unknown>;
}

export interface AnalyticsReportDefinition {
  id: string;
  name: string;
  description: string;
  owner: string;
  metricIds: string[];
  schedule: string | null;
  status: AnalyticsReportStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsReportSnapshot {
  report: AnalyticsReportDefinition;
  generatedAt: string;
  observations: AnalyticsMetricObservation[];
  missingMetricIds: string[];
}

export interface AnalyticsMissionContext {
  summary: string;
  generatedAt: string;
  evidence: Array<{ id: string; source: string; locator: string; retrievedAt: string }>;
  uncertainties: string[];
}
