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
  listMetrics(options?: {
    sourceId?: string;
    status?: AnalyticsMetricStatus;
    limit?: number;
  }): Promise<AnalyticsMetricDefinition[]>;

  saveMetricObservation(observation: AnalyticsMetricObservation): Promise<void>;
  latestMetricObservation(metricId: string): Promise<AnalyticsMetricObservation | null>;
  listMetricObservations(metricId: string, limit?: number): Promise<AnalyticsMetricObservation[]>;

  saveQueryRun(run: AnalyticsQueryRun): Promise<void>;
  getQueryRun(id: string): Promise<AnalyticsQueryRun | null>;
  listQueryRuns(options?: {
    sourceId?: string;
    status?: AnalyticsQueryStatus;
    limit?: number;
  }): Promise<AnalyticsQueryRun[]>;

  saveQualityRule(rule: AnalyticsQualityRule): Promise<void>;
  getQualityRule(id: string): Promise<AnalyticsQualityRule | null>;
  listQualityRules(options?: {
    sourceId?: string;
    dataset?: string;
    active?: boolean;
    limit?: number;
  }): Promise<AnalyticsQualityRule[]>;

  saveQualityRun(run: AnalyticsQualityRun): Promise<void>;
  getQualityRun(id: string): Promise<AnalyticsQualityRun | null>;
  listQualityRuns(options?: {
    sourceId?: string;
    dataset?: string;
    limit?: number;
  }): Promise<AnalyticsQualityRun[]>;

  saveProfile(profile: AnalyticsDatasetProfile): Promise<void>;
  getProfile(id: string): Promise<AnalyticsDatasetProfile | null>;
  listProfiles(options?: {
    sourceId?: string;
    dataset?: string;
    limit?: number;
  }): Promise<AnalyticsDatasetProfile[]>;

  saveLineage(edge: AnalyticsLineageEdge): Promise<void>;
  listLineage(options?: {
    fromId?: string;
    toId?: string;
    limit?: number;
  }): Promise<AnalyticsLineageEdge[]>;

  saveForecastEvaluation(evaluation: AnalyticsForecastEvaluation): Promise<void>;
  getForecastEvaluation(id: string): Promise<AnalyticsForecastEvaluation | null>;
  listForecastEvaluations(options?: {
    sourceId?: string;
    dataset?: string;
    limit?: number;
  }): Promise<AnalyticsForecastEvaluation[]>;

  saveReport(report: AnalyticsReportDefinition): Promise<void>;
  getReport(id: string): Promise<AnalyticsReportDefinition | null>;
  listReports(options?: {
    status?: AnalyticsReportStatus;
    limit?: number;
  }): Promise<AnalyticsReportDefinition[]>;
}
