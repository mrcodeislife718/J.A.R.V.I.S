import type { Pool, QueryResultRow } from "pg";
import type { AnalyticsRepository } from "./repository.js";
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

interface PayloadRow<T> extends QueryResultRow {
  payload: T;
}

const payloads = <T>(rows: Array<PayloadRow<T>>): T[] => rows.map((row) => row.payload);
const firstPayload = <T>(rows: Array<PayloadRow<T>>): T | null => rows[0]?.payload ?? null;

export class PostgresAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly pool: Pool) {}

  async saveSource(source: AnalyticsDataSource): Promise<void> {
    await this.pool.query(
      `INSERT INTO analytics_sources (id, kind, status, sensitivity, owner, updated_at, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         kind = EXCLUDED.kind,
         status = EXCLUDED.status,
         sensitivity = EXCLUDED.sensitivity,
         owner = EXCLUDED.owner,
         updated_at = EXCLUDED.updated_at,
         payload = EXCLUDED.payload`,
      [source.id, source.kind, source.status, source.sensitivity, source.owner, source.updatedAt, source],
    );
  }

  async getSource(id: string): Promise<AnalyticsDataSource | null> {
    const result = await this.pool.query<PayloadRow<AnalyticsDataSource>>(
      "SELECT payload FROM analytics_sources WHERE id = $1",
      [id],
    );
    return firstPayload(result.rows);
  }

  async listSources(): Promise<AnalyticsDataSource[]> {
    const result = await this.pool.query<PayloadRow<AnalyticsDataSource>>(
      "SELECT payload FROM analytics_sources ORDER BY updated_at DESC",
    );
    return payloads(result.rows);
  }

  async saveSchema(snapshot: AnalyticsSchemaSnapshot): Promise<void> {
    await this.pool.query(
      `INSERT INTO analytics_schema_snapshots
       (id, source_id, version, fingerprint, observed_at, payload)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [snapshot.id, snapshot.sourceId, snapshot.version, snapshot.fingerprint, snapshot.observedAt, snapshot],
    );
  }

  async getSchema(id: string): Promise<AnalyticsSchemaSnapshot | null> {
    const result = await this.pool.query<PayloadRow<AnalyticsSchemaSnapshot>>(
      "SELECT payload FROM analytics_schema_snapshots WHERE id = $1",
      [id],
    );
    return firstPayload(result.rows);
  }

  async latestSchema(sourceId: string): Promise<AnalyticsSchemaSnapshot | null> {
    const result = await this.pool.query<PayloadRow<AnalyticsSchemaSnapshot>>(
      `SELECT payload FROM analytics_schema_snapshots
       WHERE source_id = $1 ORDER BY version DESC, observed_at DESC LIMIT 1`,
      [sourceId],
    );
    return firstPayload(result.rows);
  }

  async listSchemas(sourceId: string, limit = 100): Promise<AnalyticsSchemaSnapshot[]> {
    const result = await this.pool.query<PayloadRow<AnalyticsSchemaSnapshot>>(
      `SELECT payload FROM analytics_schema_snapshots
       WHERE source_id = $1 ORDER BY version DESC, observed_at DESC LIMIT $2`,
      [sourceId, limit],
    );
    return payloads(result.rows);
  }

  async saveMetric(metric: AnalyticsMetricDefinition): Promise<void> {
    await this.pool.query(
      `INSERT INTO analytics_metrics (id, source_id, status, version, updated_at, payload)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         source_id = EXCLUDED.source_id,
         status = EXCLUDED.status,
         version = EXCLUDED.version,
         updated_at = EXCLUDED.updated_at,
         payload = EXCLUDED.payload`,
      [metric.id, metric.sourceId, metric.status, metric.version, metric.updatedAt, metric],
    );
  }

  async getMetric(id: string): Promise<AnalyticsMetricDefinition | null> {
    const result = await this.pool.query<PayloadRow<AnalyticsMetricDefinition>>(
      "SELECT payload FROM analytics_metrics WHERE id = $1",
      [id],
    );
    return firstPayload(result.rows);
  }

  async listMetrics(
    options: { sourceId?: string; status?: AnalyticsMetricStatus; limit?: number } = {},
  ): Promise<AnalyticsMetricDefinition[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.sourceId) {
      values.push(options.sourceId);
      conditions.push(`source_id = $${values.length}`);
    }
    if (options.status) {
      values.push(options.status);
      conditions.push(`status = $${values.length}`);
    }
    values.push(options.limit ?? 200);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.pool.query<PayloadRow<AnalyticsMetricDefinition>>(
      `SELECT payload FROM analytics_metrics ${where} ORDER BY updated_at DESC LIMIT $${values.length}`,
      values,
    );
    return payloads(result.rows);
  }

  async saveMetricObservation(observation: AnalyticsMetricObservation): Promise<void> {
    await this.pool.query(
      `INSERT INTO analytics_metric_observations (id, metric_id, source_id, computed_at, payload)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [observation.id, observation.metricId, observation.sourceId, observation.computedAt, observation],
    );
  }

  async latestMetricObservation(metricId: string): Promise<AnalyticsMetricObservation | null> {
    const result = await this.pool.query<PayloadRow<AnalyticsMetricObservation>>(
      `SELECT payload FROM analytics_metric_observations
       WHERE metric_id = $1 ORDER BY computed_at DESC LIMIT 1`,
      [metricId],
    );
    return firstPayload(result.rows);
  }

  async listMetricObservations(metricId: string, limit = 100): Promise<AnalyticsMetricObservation[]> {
    const result = await this.pool.query<PayloadRow<AnalyticsMetricObservation>>(
      `SELECT payload FROM analytics_metric_observations
       WHERE metric_id = $1 ORDER BY computed_at DESC LIMIT $2`,
      [metricId, limit],
    );
    return payloads(result.rows);
  }

  async saveQueryRun(run: AnalyticsQueryRun): Promise<void> {
    await this.pool.query(
      `INSERT INTO analytics_query_runs (id, source_id, status, created_at, payload)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, payload = EXCLUDED.payload`,
      [run.id, run.sourceId, run.status, run.createdAt, run],
    );
  }

  async getQueryRun(id: string): Promise<AnalyticsQueryRun | null> {
    const result = await this.pool.query<PayloadRow<AnalyticsQueryRun>>(
      "SELECT payload FROM analytics_query_runs WHERE id = $1",
      [id],
    );
    return firstPayload(result.rows);
  }

  async listQueryRuns(
    options: { sourceId?: string; status?: AnalyticsQueryStatus; limit?: number } = {},
  ): Promise<AnalyticsQueryRun[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.sourceId) {
      values.push(options.sourceId);
      conditions.push(`source_id = $${values.length}`);
    }
    if (options.status) {
      values.push(options.status);
      conditions.push(`status = $${values.length}`);
    }
    values.push(options.limit ?? 200);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.pool.query<PayloadRow<AnalyticsQueryRun>>(
      `SELECT payload FROM analytics_query_runs ${where} ORDER BY created_at DESC LIMIT $${values.length}`,
      values,
    );
    return payloads(result.rows);
  }

  async saveQualityRule(rule: AnalyticsQualityRule): Promise<void> {
    await this.pool.query(
      `INSERT INTO analytics_quality_rules (id, source_id, dataset, active, updated_at, payload)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         source_id = EXCLUDED.source_id,
         dataset = EXCLUDED.dataset,
         active = EXCLUDED.active,
         updated_at = EXCLUDED.updated_at,
         payload = EXCLUDED.payload`,
      [rule.id, rule.sourceId, rule.dataset, rule.active, rule.updatedAt, rule],
    );
  }

  async getQualityRule(id: string): Promise<AnalyticsQualityRule | null> {
    const result = await this.pool.query<PayloadRow<AnalyticsQualityRule>>(
      "SELECT payload FROM analytics_quality_rules WHERE id = $1",
      [id],
    );
    return firstPayload(result.rows);
  }

  async listQualityRules(
    options: { sourceId?: string; dataset?: string; active?: boolean; limit?: number } = {},
  ): Promise<AnalyticsQualityRule[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.sourceId) {
      values.push(options.sourceId);
      conditions.push(`source_id = $${values.length}`);
    }
    if (options.dataset) {
      values.push(options.dataset);
      conditions.push(`dataset = $${values.length}`);
    }
    if (options.active !== undefined) {
      values.push(options.active);
      conditions.push(`active = $${values.length}`);
    }
    values.push(options.limit ?? 200);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.pool.query<PayloadRow<AnalyticsQualityRule>>(
      `SELECT payload FROM analytics_quality_rules ${where} ORDER BY updated_at DESC LIMIT $${values.length}`,
      values,
    );
    return payloads(result.rows);
  }

  async saveQualityRun(run: AnalyticsQualityRun): Promise<void> {
    await this.pool.query(
      `INSERT INTO analytics_quality_runs (id, source_id, dataset, passed, executed_at, payload)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [run.id, run.sourceId, run.dataset, run.passed, run.executedAt, run],
    );
  }

  async getQualityRun(id: string): Promise<AnalyticsQualityRun | null> {
    const result = await this.pool.query<PayloadRow<AnalyticsQualityRun>>(
      "SELECT payload FROM analytics_quality_runs WHERE id = $1",
      [id],
    );
    return firstPayload(result.rows);
  }

  async listQualityRuns(
    options: { sourceId?: string; dataset?: string; limit?: number } = {},
  ): Promise<AnalyticsQualityRun[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.sourceId) {
      values.push(options.sourceId);
      conditions.push(`source_id = $${values.length}`);
    }
    if (options.dataset) {
      values.push(options.dataset);
      conditions.push(`dataset = $${values.length}`);
    }
    values.push(options.limit ?? 200);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.pool.query<PayloadRow<AnalyticsQualityRun>>(
      `SELECT payload FROM analytics_quality_runs ${where} ORDER BY executed_at DESC LIMIT $${values.length}`,
      values,
    );
    return payloads(result.rows);
  }

  async saveProfile(profile: AnalyticsDatasetProfile): Promise<void> {
    await this.pool.query(
      `INSERT INTO analytics_dataset_profiles (id, source_id, dataset, profiled_at, payload)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [profile.id, profile.sourceId, profile.dataset, profile.profiledAt, profile],
    );
  }

  async getProfile(id: string): Promise<AnalyticsDatasetProfile | null> {
    const result = await this.pool.query<PayloadRow<AnalyticsDatasetProfile>>(
      "SELECT payload FROM analytics_dataset_profiles WHERE id = $1",
      [id],
    );
    return firstPayload(result.rows);
  }

  async listProfiles(
    options: { sourceId?: string; dataset?: string; limit?: number } = {},
  ): Promise<AnalyticsDatasetProfile[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.sourceId) {
      values.push(options.sourceId);
      conditions.push(`source_id = $${values.length}`);
    }
    if (options.dataset) {
      values.push(options.dataset);
      conditions.push(`dataset = $${values.length}`);
    }
    values.push(options.limit ?? 200);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.pool.query<PayloadRow<AnalyticsDatasetProfile>>(
      `SELECT payload FROM analytics_dataset_profiles ${where} ORDER BY profiled_at DESC LIMIT $${values.length}`,
      values,
    );
    return payloads(result.rows);
  }

  async saveLineage(edge: AnalyticsLineageEdge): Promise<void> {
    await this.pool.query(
      `INSERT INTO analytics_lineage
       (id, from_kind, from_id, to_kind, to_id, created_at, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [edge.id, edge.fromKind, edge.fromId, edge.toKind, edge.toId, edge.createdAt, edge],
    );
  }

  async listLineage(
    options: { fromId?: string; toId?: string; limit?: number } = {},
  ): Promise<AnalyticsLineageEdge[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.fromId) {
      values.push(options.fromId);
      conditions.push(`from_id = $${values.length}`);
    }
    if (options.toId) {
      values.push(options.toId);
      conditions.push(`to_id = $${values.length}`);
    }
    values.push(options.limit ?? 500);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.pool.query<PayloadRow<AnalyticsLineageEdge>>(
      `SELECT payload FROM analytics_lineage ${where} ORDER BY created_at DESC LIMIT $${values.length}`,
      values,
    );
    return payloads(result.rows);
  }

  async saveForecastEvaluation(evaluation: AnalyticsForecastEvaluation): Promise<void> {
    await this.pool.query(
      `INSERT INTO analytics_forecast_evaluations (id, source_id, dataset, evaluated_at, payload)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [evaluation.id, evaluation.sourceId, evaluation.dataset, evaluation.evaluatedAt, evaluation],
    );
  }

  async getForecastEvaluation(id: string): Promise<AnalyticsForecastEvaluation | null> {
    const result = await this.pool.query<PayloadRow<AnalyticsForecastEvaluation>>(
      "SELECT payload FROM analytics_forecast_evaluations WHERE id = $1",
      [id],
    );
    return firstPayload(result.rows);
  }

  async listForecastEvaluations(
    options: { sourceId?: string; dataset?: string; limit?: number } = {},
  ): Promise<AnalyticsForecastEvaluation[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.sourceId) {
      values.push(options.sourceId);
      conditions.push(`source_id = $${values.length}`);
    }
    if (options.dataset) {
      values.push(options.dataset);
      conditions.push(`dataset = $${values.length}`);
    }
    values.push(options.limit ?? 200);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.pool.query<PayloadRow<AnalyticsForecastEvaluation>>(
      `SELECT payload FROM analytics_forecast_evaluations ${where} ORDER BY evaluated_at DESC LIMIT $${values.length}`,
      values,
    );
    return payloads(result.rows);
  }

  async saveReport(report: AnalyticsReportDefinition): Promise<void> {
    await this.pool.query(
      `INSERT INTO analytics_reports (id, status, updated_at, payload)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at,
         payload = EXCLUDED.payload`,
      [report.id, report.status, report.updatedAt, report],
    );
  }

  async getReport(id: string): Promise<AnalyticsReportDefinition | null> {
    const result = await this.pool.query<PayloadRow<AnalyticsReportDefinition>>(
      "SELECT payload FROM analytics_reports WHERE id = $1",
      [id],
    );
    return firstPayload(result.rows);
  }

  async listReports(
    options: { status?: AnalyticsReportStatus; limit?: number } = {},
  ): Promise<AnalyticsReportDefinition[]> {
    const values: unknown[] = [];
    const conditions: string[] = [];
    if (options.status) {
      values.push(options.status);
      conditions.push(`status = $${values.length}`);
    }
    values.push(options.limit ?? 200);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.pool.query<PayloadRow<AnalyticsReportDefinition>>(
      `SELECT payload FROM analytics_reports ${where} ORDER BY updated_at DESC LIMIT $${values.length}`,
      values,
    );
    return payloads(result.rows);
  }
}
