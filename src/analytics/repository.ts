import type {
  AnalyticsDataSource,
  AnalyticsDatasetProfile,
  AnalyticsForecastEvaluation,
  AnalyticsLineageEdge,
  AnalyticsMetricDefinition,
  AnalyticsMetricObservation,
  AnalyticsMetricStatus,
  AnalyticsQualityRule,
  AnalyticsQualityRun,
  AnalyticsQueryRun,
  AnalyticsQueryStatus,
  AnalyticsReportDefinition,
  AnalyticsReportStatus,
  AnalyticsSchemaSnapshot,
} from "./types.js";

export interface AnalyticsMetricListOptions {
  sourceId?: string | undefined;
  status?: AnalyticsMetricStatus | undefined;
  limit?: number | undefined;
}

export interface AnalyticsQueryRunListOptions {
  sourceId?: string | undefined;
  status?: AnalyticsQueryStatus | undefined;
  limit?: number | undefined;
}

export interface AnalyticsQualityRuleListOptions {
  sourceId?: string | undefined;
  dataset?: string | undefined;
  active?: boolean | undefined;
  limit?: number | undefined;
}

export interface AnalyticsDatasetListOptions {
  sourceId?: string | undefined;
  dataset?: string | undefined;
  limit?: number | undefined;
}

export interface AnalyticsLineageListOptions {
  fromId?: string | undefined;
  toId?: string | undefined;
  limit?: number | undefined;
}

export interface AnalyticsReportListOptions {
  status?: AnalyticsReportStatus | undefined;
  limit?: number | undefined;
}

export interface AnalyticsRepository {
  saveSource(source: AnalyticsDataSource): Promise<void>;
  getSource(id: string): Promise<AnalyticsDataSource | null>;
  listSources(): Promise<AnalyticsDataSource[]>;

  saveSchema(snapshot: AnalyticsSchemaSnapshot): Promise<void>;
  getSchema(id: string): Promise<AnalyticsSchemaSnapshot | null>;
  latestSchema(sourceId: string): Promise<AnalyticsSchemaSnapshot | null>;
  listSchemas(sourceId: string, limit?: number): Promise<AnalyticsSchemaSnapshot[]>;

  saveMetric(metric: AnalyticsMetricDefinition): Promise<void>;
  getMetric(id: string): Promise<AnalyticsMetricDefinition | null>;
  listMetrics(options?: AnalyticsMetricListOptions): Promise<AnalyticsMetricDefinition[]>;

  saveMetricObservation(observation: AnalyticsMetricObservation): Promise<void>;
  latestMetricObservation(metricId: string): Promise<AnalyticsMetricObservation | null>;
  listMetricObservations(metricId: string, limit?: number): Promise<AnalyticsMetricObservation[]>;

  saveQueryRun(run: AnalyticsQueryRun): Promise<void>;
  getQueryRun(id: string): Promise<AnalyticsQueryRun | null>;
  listQueryRuns(options?: AnalyticsQueryRunListOptions): Promise<AnalyticsQueryRun[]>;

  saveQualityRule(rule: AnalyticsQualityRule): Promise<void>;
  getQualityRule(id: string): Promise<AnalyticsQualityRule | null>;
  listQualityRules(options?: AnalyticsQualityRuleListOptions): Promise<AnalyticsQualityRule[]>;

  saveQualityRun(run: AnalyticsQualityRun): Promise<void>;
  getQualityRun(id: string): Promise<AnalyticsQualityRun | null>;
  listQualityRuns(options?: AnalyticsDatasetListOptions): Promise<AnalyticsQualityRun[]>;

  saveProfile(profile: AnalyticsDatasetProfile): Promise<void>;
  getProfile(id: string): Promise<AnalyticsDatasetProfile | null>;
  listProfiles(options?: AnalyticsDatasetListOptions): Promise<AnalyticsDatasetProfile[]>;

  saveLineage(edge: AnalyticsLineageEdge): Promise<void>;
  listLineage(options?: AnalyticsLineageListOptions): Promise<AnalyticsLineageEdge[]>;

  saveForecastEvaluation(evaluation: AnalyticsForecastEvaluation): Promise<void>;
  getForecastEvaluation(id: string): Promise<AnalyticsForecastEvaluation | null>;
  listForecastEvaluations(options?: AnalyticsDatasetListOptions): Promise<AnalyticsForecastEvaluation[]>;

  saveReport(report: AnalyticsReportDefinition): Promise<void>;
  getReport(id: string): Promise<AnalyticsReportDefinition | null>;
  listReports(options?: AnalyticsReportListOptions): Promise<AnalyticsReportDefinition[]>;
}
