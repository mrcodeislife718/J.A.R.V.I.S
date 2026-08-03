import type { AnalyticsRepository } from "./repository.js";
import type {
  AnalyticsDataSource,
  AnalyticsDatasetProfile,
  AnalyticsForecastEvaluation,
  AnalyticsLineageEdge,
  AnalyticsMetricDefinition,
  AnalyticsMetricObservation,
  AnalyticsQualityRule,
  AnalyticsQualityRun,
  AnalyticsQueryRun,
  AnalyticsReportDefinition,
  AnalyticsSchemaSnapshot,
} from "./types.js";

const clone = <T>(value: T): T => structuredClone(value);
const descending = (left: string, right: string): number => right.localeCompare(left);

export class InMemoryAnalyticsRepository implements AnalyticsRepository {
  private readonly sources = new Map<string, AnalyticsDataSource>();
  private readonly schemas = new Map<string, AnalyticsSchemaSnapshot>();
  private readonly metrics = new Map<string, AnalyticsMetricDefinition>();
  private readonly observations = new Map<string, AnalyticsMetricObservation>();
  private readonly queryRuns = new Map<string, AnalyticsQueryRun>();
  private readonly qualityRules = new Map<string, AnalyticsQualityRule>();
  private readonly qualityRuns = new Map<string, AnalyticsQualityRun>();
  private readonly profiles = new Map<string, AnalyticsDatasetProfile>();
  private readonly lineage = new Map<string, AnalyticsLineageEdge>();
  private readonly forecasts = new Map<string, AnalyticsForecastEvaluation>();
  private readonly reports = new Map<string, AnalyticsReportDefinition>();

  async saveSource(source: AnalyticsDataSource): Promise<void> {
    this.sources.set(source.id, clone(source));
  }

  async getSource(id: string): Promise<AnalyticsDataSource | null> {
    const source = this.sources.get(id);
    return source ? clone(source) : null;
  }

  async listSources(): Promise<AnalyticsDataSource[]> {
    return [...this.sources.values()].sort((a, b) => descending(a.updatedAt, b.updatedAt)).map(clone);
  }

  async saveSchema(snapshot: AnalyticsSchemaSnapshot): Promise<void> {
    this.schemas.set(snapshot.id, clone(snapshot));
  }

  async getSchema(id: string): Promise<AnalyticsSchemaSnapshot | null> {
    const schema = this.schemas.get(id);
    return schema ? clone(schema) : null;
  }

  async latestSchema(sourceId: string): Promise<AnalyticsSchemaSnapshot | null> {
    const schema = [...this.schemas.values()]
      .filter((item) => item.sourceId === sourceId)
      .sort((a, b) => b.version - a.version || descending(a.observedAt, b.observedAt))[0];
    return schema ? clone(schema) : null;
  }

  async listSchemas(sourceId: string, limit = 100): Promise<AnalyticsSchemaSnapshot[]> {
    return [...this.schemas.values()]
      .filter((item) => item.sourceId === sourceId)
      .sort((a, b) => b.version - a.version || descending(a.observedAt, b.observedAt))
      .slice(0, limit)
      .map(clone);
  }

  async saveMetric(metric: AnalyticsMetricDefinition): Promise<void> {
    this.metrics.set(metric.id, clone(metric));
  }

  async getMetric(id: string): Promise<AnalyticsMetricDefinition | null> {
    const metric = this.metrics.get(id);
    return metric ? clone(metric) : null;
  }

  async listMetrics(
    options: {
      sourceId?: string;
      status?: AnalyticsMetricDefinition["status"];
      limit?: number;
    } = {},
  ): Promise<AnalyticsMetricDefinition[]> {
    return [...this.metrics.values()]
      .filter((metric) => !options.sourceId || metric.sourceId === options.sourceId)
      .filter((metric) => !options.status || metric.status === options.status)
      .sort((a, b) => descending(a.updatedAt, b.updatedAt))
      .slice(0, options.limit ?? 200)
      .map(clone);
  }

  async saveMetricObservation(observation: AnalyticsMetricObservation): Promise<void> {
    this.observations.set(observation.id, clone(observation));
  }

  async latestMetricObservation(metricId: string): Promise<AnalyticsMetricObservation | null> {
    const observation = [...this.observations.values()]
      .filter((item) => item.metricId === metricId)
      .sort((a, b) => descending(a.computedAt, b.computedAt))[0];
    return observation ? clone(observation) : null;
  }

  async listMetricObservations(metricId: string, limit = 100): Promise<AnalyticsMetricObservation[]> {
    return [...this.observations.values()]
      .filter((item) => item.metricId === metricId)
      .sort((a, b) => descending(a.computedAt, b.computedAt))
      .slice(0, limit)
      .map(clone);
  }

  async saveQueryRun(run: AnalyticsQueryRun): Promise<void> {
    this.queryRuns.set(run.id, clone(run));
  }

  async getQueryRun(id: string): Promise<AnalyticsQueryRun | null> {
    const run = this.queryRuns.get(id);
    return run ? clone(run) : null;
  }

  async listQueryRuns(
    options: {
      sourceId?: string;
      status?: AnalyticsQueryRun["status"];
      limit?: number;
    } = {},
  ): Promise<AnalyticsQueryRun[]> {
    return [...this.queryRuns.values()]
      .filter((run) => !options.sourceId || run.sourceId === options.sourceId)
      .filter((run) => !options.status || run.status === options.status)
      .sort((a, b) => descending(a.createdAt, b.createdAt))
      .slice(0, options.limit ?? 200)
      .map(clone);
  }

  async saveQualityRule(rule: AnalyticsQualityRule): Promise<void> {
    this.qualityRules.set(rule.id, clone(rule));
  }

  async getQualityRule(id: string): Promise<AnalyticsQualityRule | null> {
    const rule = this.qualityRules.get(id);
    return rule ? clone(rule) : null;
  }

  async listQualityRules(
    options: { sourceId?: string; dataset?: string; active?: boolean; limit?: number } = {},
  ): Promise<AnalyticsQualityRule[]> {
    return [...this.qualityRules.values()]
      .filter((rule) => !options.sourceId || rule.sourceId === options.sourceId)
      .filter((rule) => !options.dataset || rule.dataset === options.dataset)
      .filter((rule) => options.active === undefined || rule.active === options.active)
      .sort((a, b) => descending(a.updatedAt, b.updatedAt))
      .slice(0, options.limit ?? 200)
      .map(clone);
  }

  async saveQualityRun(run: AnalyticsQualityRun): Promise<void> {
    this.qualityRuns.set(run.id, clone(run));
  }

  async getQualityRun(id: string): Promise<AnalyticsQualityRun | null> {
    const run = this.qualityRuns.get(id);
    return run ? clone(run) : null;
  }

  async listQualityRuns(
    options: { sourceId?: string; dataset?: string; limit?: number } = {},
  ): Promise<AnalyticsQualityRun[]> {
    return [...this.qualityRuns.values()]
      .filter((run) => !options.sourceId || run.sourceId === options.sourceId)
      .filter((run) => !options.dataset || run.dataset === options.dataset)
      .sort((a, b) => descending(a.executedAt, b.executedAt))
      .slice(0, options.limit ?? 200)
      .map(clone);
  }

  async saveProfile(profile: AnalyticsDatasetProfile): Promise<void> {
    this.profiles.set(profile.id, clone(profile));
  }

  async getProfile(id: string): Promise<AnalyticsDatasetProfile | null> {
    const profile = this.profiles.get(id);
    return profile ? clone(profile) : null;
  }

  async listProfiles(
    options: { sourceId?: string; dataset?: string; limit?: number } = {},
  ): Promise<AnalyticsDatasetProfile[]> {
    return [...this.profiles.values()]
      .filter((profile) => !options.sourceId || profile.sourceId === options.sourceId)
      .filter((profile) => !options.dataset || profile.dataset === options.dataset)
      .sort((a, b) => descending(a.profiledAt, b.profiledAt))
      .slice(0, options.limit ?? 200)
      .map(clone);
  }

  async saveLineage(edge: AnalyticsLineageEdge): Promise<void> {
    this.lineage.set(edge.id, clone(edge));
  }

  async listLineage(
    options: { fromId?: string; toId?: string; limit?: number } = {},
  ): Promise<AnalyticsLineageEdge[]> {
    return [...this.lineage.values()]
      .filter((edge) => !options.fromId || edge.fromId === options.fromId)
      .filter((edge) => !options.toId || edge.toId === options.toId)
      .sort((a, b) => descending(a.createdAt, b.createdAt))
      .slice(0, options.limit ?? 500)
      .map(clone);
  }

  async saveForecastEvaluation(evaluation: AnalyticsForecastEvaluation): Promise<void> {
    this.forecasts.set(evaluation.id, clone(evaluation));
  }

  async getForecastEvaluation(id: string): Promise<AnalyticsForecastEvaluation | null> {
    const evaluation = this.forecasts.get(id);
    return evaluation ? clone(evaluation) : null;
  }

  async listForecastEvaluations(
    options: { sourceId?: string; dataset?: string; limit?: number } = {},
  ): Promise<AnalyticsForecastEvaluation[]> {
    return [...this.forecasts.values()]
      .filter((evaluation) => !options.sourceId || evaluation.sourceId === options.sourceId)
      .filter((evaluation) => !options.dataset || evaluation.dataset === options.dataset)
      .sort((a, b) => descending(a.evaluatedAt, b.evaluatedAt))
      .slice(0, options.limit ?? 200)
      .map(clone);
  }

  async saveReport(report: AnalyticsReportDefinition): Promise<void> {
    this.reports.set(report.id, clone(report));
  }

  async getReport(id: string): Promise<AnalyticsReportDefinition | null> {
    const report = this.reports.get(id);
    return report ? clone(report) : null;
  }

  async listReports(
    options: { status?: AnalyticsReportDefinition["status"]; limit?: number } = {},
  ): Promise<AnalyticsReportDefinition[]> {
    return [...this.reports.values()]
      .filter((report) => !options.status || report.status === options.status)
      .sort((a, b) => descending(a.updatedAt, b.updatedAt))
      .slice(0, options.limit ?? 200)
      .map(clone);
  }
}
