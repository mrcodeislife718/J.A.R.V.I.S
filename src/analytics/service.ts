import { createHash, randomUUID } from "node:crypto";
import { calculateMetricValue, evaluateQualityRule, filterRows, profileRows } from "./calculations.js";
import { evaluateAgainstConstantBaseline } from "./forecast.js";
import type { AnalyticsQueryExecutor } from "./query-executor.js";
import type { AnalyticsRepository } from "./repository.js";
import { AnalyticsSqlValidator } from "./sql-validator.js";
import type {
  AnalyticsDataSource,
  AnalyticsDatasetProfile,
  AnalyticsForecastEvaluation,
  AnalyticsLineageEdge,
  AnalyticsMetricCalculation,
  AnalyticsMetricDefinition,
  AnalyticsMetricObservation,
  AnalyticsMissionContext,
  AnalyticsQualityRule,
  AnalyticsQualityRun,
  AnalyticsQueryResult,
  AnalyticsQueryRun,
  AnalyticsReportDefinition,
  AnalyticsReportSnapshot,
  AnalyticsRow,
  AnalyticsScalar,
  AnalyticsSchemaSnapshot,
  AnalyticsSensitivity,
  AnalyticsSourceKind,
  AnalyticsSqlValidation,
  AnalyticsTableSchema,
} from "./types.js";

export interface CreateAnalyticsSourceInput {
  id?: string;
  name: string;
  description?: string;
  kind: AnalyticsSourceKind;
  sensitivity?: AnalyticsSensitivity;
  requiresApproval?: boolean;
  endpointLabel?: string;
  credentialRef?: string;
  owner: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateSchemaSnapshotInput {
  sourceId: string;
  tables: AnalyticsTableSchema[];
  observedBy: string;
  metadata?: Record<string, unknown>;
}

export interface CreateMetricInput {
  id?: string;
  sourceId: string;
  dataset: string;
  name: string;
  description: string;
  owner: string;
  unit?: string;
  grain: string;
  dimensions?: string[];
  filters?: Record<string, AnalyticsScalar>;
  calculation: AnalyticsMetricCalculation;
}

export interface ExecuteAnalyticsQueryInput {
  sourceId: string;
  sql: string;
  parameters?: AnalyticsScalar[];
  purpose: string;
  requestedBy: string;
  authorizedBy?: string;
  maxRows?: number;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateQualityRuleInput {
  id?: string;
  sourceId: string;
  dataset: string;
  name: string;
  kind: AnalyticsQualityRule["kind"];
  column: string;
  configuration?: Record<string, unknown>;
  maximumFailureRatio?: number;
  owner: string;
}

export interface EvaluateForecastInput {
  sourceId?: string;
  dataset: string;
  target: string;
  modelName: string;
  actual: number[];
  predicted: number[];
  baselineValue: number;
  evaluatedBy: string;
  metadata?: Record<string, unknown>;
}

export interface CreateReportInput {
  id?: string;
  name: string;
  description: string;
  owner: string;
  metricIds: string[];
  schedule?: string;
}

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
};

const hash = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");

const normalizeList = (values: string[] | undefined): string[] =>
  [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].sort();

const requireRatio = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${label} must be between 0 and 1`);
};

const requirePositiveInteger = (value: number, label: string): void => {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
};

const credentialReference = (value: string | undefined): string | null => {
  if (!value?.trim()) return null;
  const normalized = value.trim();
  if (normalized.includes("://") || /\s/u.test(normalized)) {
    throw new Error("credentialRef must be an opaque secret-manager or environment reference, not a connection string");
  }
  return normalized;
};

const validateCalculation = (calculation: AnalyticsMetricCalculation): void => {
  if (calculation.type === "count") {
    if (calculation.column !== null && calculation.column.trim().length === 0) {
      throw new Error("Count metric column cannot be empty");
    }
    return;
  }
  if (calculation.type === "ratio") {
    if (!calculation.numeratorColumn.trim() || !calculation.denominatorColumn.trim()) {
      throw new Error("Ratio metric requires numerator and denominator columns");
    }
    if (!Number.isFinite(calculation.multiplier)) throw new Error("Ratio multiplier must be finite");
    return;
  }
  if (!calculation.column.trim()) throw new Error("Metric calculation column cannot be empty");
};

const validateRows = (rows: AnalyticsRow[], maximum = 50_000): void => {
  if (rows.length > maximum) throw new Error(`Rows exceed the ${maximum} row request limit`);
  for (const row of rows) {
    for (const value of Object.values(row)) {
      if (value !== null && !["string", "number", "boolean"].includes(typeof value)) {
        throw new Error("Analytics rows may contain only string, number, boolean, or null values");
      }
      if (typeof value === "number" && !Number.isFinite(value)) {
        throw new Error("Analytics rows may not contain NaN or infinite numbers");
      }
    }
  }
};

export class AnalyticsService {
  private readonly validator = new AnalyticsSqlValidator();

  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly queryExecutor: AnalyticsQueryExecutor,
    private readonly defaults: { maxRows: number; timeoutMs: number },
  ) {
    requirePositiveInteger(defaults.maxRows, "Default max rows");
    requirePositiveInteger(defaults.timeoutMs, "Default query timeout");
  }

  validateSql(sql: string): AnalyticsSqlValidation {
    return this.validator.validate(sql);
  }

  async createSource(input: CreateAnalyticsSourceInput): Promise<AnalyticsDataSource> {
    const now = new Date().toISOString();
    const id = input.id?.trim() || randomUUID();
    const existing = await this.repository.getSource(id);
    const source: AnalyticsDataSource = {
      id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      kind: input.kind,
      status: existing?.status ?? "active",
      sensitivity: input.sensitivity ?? "internal",
      requiresApproval: input.requiresApproval ?? input.sensitivity === "confidential" || input.sensitivity === "restricted",
      endpointLabel: input.endpointLabel?.trim() || null,
      credentialRef: credentialReference(input.credentialRef),
      owner: input.owner.trim(),
      tags: normalizeList(input.tags),
      metadata: { ...(existing?.metadata ?? {}), ...(input.metadata ?? {}) },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (!source.name || !source.owner) throw new Error("Source name and owner are required");
    await this.repository.saveSource(source);
    await this.saveLineage("source", source.id, "source", source.id, existing ? "source-updated" : "source-registered", {
      kind: source.kind,
      sensitivity: source.sensitivity,
    });
    return source;
  }

  async disableSource(id: string): Promise<AnalyticsDataSource> {
    const source = await this.requireSource(id);
    source.status = "disabled";
    source.updatedAt = new Date().toISOString();
    await this.repository.saveSource(source);
    return source;
  }

  async getSource(id: string): Promise<AnalyticsDataSource | null> {
    return this.repository.getSource(id);
  }

  async listSources(): Promise<AnalyticsDataSource[]> {
    return this.repository.listSources();
  }

  async createSchemaSnapshot(input: CreateSchemaSnapshotInput): Promise<AnalyticsSchemaSnapshot> {
    await this.requireSource(input.sourceId);
    if (input.tables.length === 0) throw new Error("Schema snapshot must contain at least one table or dataset");
    const latest = await this.repository.latestSchema(input.sourceId);
    const normalizedTables = input.tables.map((table) => ({
      ...table,
      namespace: table.namespace?.trim() || null,
      name: table.name.trim(),
      columns: table.columns.map((column) => ({
        ...column,
        name: column.name.trim(),
        dataType: column.dataType.trim(),
        description: column.description?.trim() || null,
        metadata: structuredClone(column.metadata),
      })),
      metadata: structuredClone(table.metadata),
    }));
    const snapshot: AnalyticsSchemaSnapshot = {
      id: randomUUID(),
      sourceId: input.sourceId,
      version: (latest?.version ?? 0) + 1,
      fingerprint: hash(normalizedTables),
      tables: normalizedTables,
      observedAt: new Date().toISOString(),
      observedBy: input.observedBy.trim(),
      metadata: structuredClone(input.metadata ?? {}),
    };
    await this.repository.saveSchema(snapshot);
    await this.saveLineage("source", input.sourceId, "schema", snapshot.id, "schema-observed", {
      version: snapshot.version,
      fingerprint: snapshot.fingerprint,
    });
    return snapshot;
  }

  async latestSchema(sourceId: string): Promise<AnalyticsSchemaSnapshot | null> {
    await this.requireSource(sourceId);
    return this.repository.latestSchema(sourceId);
  }

  async listSchemas(sourceId: string, limit = 100): Promise<AnalyticsSchemaSnapshot[]> {
    await this.requireSource(sourceId);
    return this.repository.listSchemas(sourceId, limit);
  }

  async createMetric(input: CreateMetricInput): Promise<AnalyticsMetricDefinition> {
    await this.requireSource(input.sourceId);
    validateCalculation(input.calculation);
    const now = new Date().toISOString();
    const id = input.id?.trim() || randomUUID();
    const existing = await this.repository.getMetric(id);
    const metric: AnalyticsMetricDefinition = {
      id,
      sourceId: input.sourceId,
      dataset: input.dataset.trim(),
      name: input.name.trim(),
      description: input.description.trim(),
      owner: input.owner.trim(),
      unit: input.unit?.trim() || null,
      grain: input.grain.trim(),
      dimensions: normalizeList(input.dimensions),
      filters: structuredClone(input.filters ?? {}),
      calculation: structuredClone(input.calculation),
      status: "candidate",
      version: (existing?.version ?? 0) + 1,
      approvedBy: null,
      approvedAt: null,
      reviewReason: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (!metric.dataset || !metric.name || !metric.description || !metric.owner || !metric.grain) {
      throw new Error("Metric dataset, name, description, owner, and grain are required");
    }
    await this.repository.saveMetric(metric);
    await this.saveLineage("source", metric.sourceId, "metric", metric.id, "candidate-metric-defined", {
      dataset: metric.dataset,
      version: metric.version,
    });
    return metric;
  }

  async reviewMetric(
    id: string,
    decision: "approve" | "reject" | "deprecate",
    reviewedBy: string,
    reason: string,
  ): Promise<AnalyticsMetricDefinition> {
    const metric = await this.requireMetric(id);
    if (decision === "approve" && metric.status !== "candidate") {
      throw new Error("Only candidate metrics can be approved");
    }
    if (decision === "reject" && metric.status !== "candidate") {
      throw new Error("Only candidate metrics can be rejected");
    }
    if (decision === "deprecate" && metric.status !== "approved") {
      throw new Error("Only approved metrics can be deprecated");
    }
    metric.status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "deprecated";
    metric.approvedBy = decision === "approve" ? reviewedBy.trim() : metric.approvedBy;
    metric.approvedAt = decision === "approve" ? new Date().toISOString() : metric.approvedAt;
    metric.reviewReason = reason.trim();
    metric.updatedAt = new Date().toISOString();
    await this.repository.saveMetric(metric);
    return metric;
  }

  async listMetrics(options: Parameters<AnalyticsRepository["listMetrics"]>[0] = {}): Promise<AnalyticsMetricDefinition[]> {
    return this.repository.listMetrics(options);
  }

  async calculateMetric(
    metricId: string,
    rows: AnalyticsRow[],
    computedBy: string,
    dimensions: Record<string, AnalyticsScalar> = {},
    metadata: Record<string, unknown> = {},
  ): Promise<AnalyticsMetricObservation> {
    const metric = await this.requireMetric(metricId);
    if (metric.status !== "approved") throw new Error("Only approved metrics can be calculated");
    validateRows(rows);
    const filtered = filterRows(rows, metric.filters);
    const value = calculateMetricValue(metric.calculation, filtered);
    const observation: AnalyticsMetricObservation = {
      id: randomUUID(),
      metricId: metric.id,
      sourceId: metric.sourceId,
      dataset: metric.dataset,
      value,
      rowCount: filtered.length,
      inputHash: hash(rows),
      dimensions: structuredClone(dimensions),
      computedAt: new Date().toISOString(),
      computedBy: computedBy.trim(),
      metadata: structuredClone(metadata),
    };
    await this.repository.saveMetricObservation(observation);
    await this.saveLineage("dataset", `${metric.sourceId}:${metric.dataset}`, "metric", metric.id, "structured-metric-calculation", {
      observationId: observation.id,
      inputHash: observation.inputHash,
      rowCount: observation.rowCount,
    });
    return observation;
  }

  async listMetricObservations(metricId: string, limit = 100): Promise<AnalyticsMetricObservation[]> {
    await this.requireMetric(metricId);
    return this.repository.listMetricObservations(metricId, limit);
  }

  async executeQuery(input: ExecuteAnalyticsQueryInput): Promise<{ run: AnalyticsQueryRun; result: AnalyticsQueryResult }> {
    const source = await this.requireSource(input.sourceId);
    const validation = this.validator.validate(input.sql);
    const now = new Date().toISOString();
    const maxRows = input.maxRows ?? this.defaults.maxRows;
    const timeoutMs = input.timeoutMs ?? this.defaults.timeoutMs;
    requirePositiveInteger(maxRows, "maxRows");
    requirePositiveInteger(timeoutMs, "timeoutMs");
    if (maxRows > this.defaults.maxRows) throw new Error(`maxRows cannot exceed ${this.defaults.maxRows}`);
    if (timeoutMs > this.defaults.timeoutMs) throw new Error(`timeoutMs cannot exceed ${this.defaults.timeoutMs}`);

    const parameters = input.parameters ?? [];
    const missingParameter = validation.parameterIndexes.find((index) => index > parameters.length);
    const authorizationMissing = source.requiresApproval && !input.authorizedBy?.trim();
    const rejectionReasons = [
      ...validation.rejectionReasons,
      ...(source.status !== "active" ? ["Data source is disabled"] : []),
      ...(authorizationMissing ? ["This source requires explicit access authorization"] : []),
      ...(missingParameter ? [`SQL references $${missingParameter} but only ${parameters.length} parameters were supplied`] : []),
    ];

    const run: AnalyticsQueryRun = {
      id: randomUUID(),
      sourceId: source.id,
      requestedBy: input.requestedBy.trim(),
      authorizedBy: input.authorizedBy?.trim() || null,
      purpose: input.purpose.trim(),
      sqlHash: hash(validation.normalizedSql),
      normalizedSql: validation.normalizedSql,
      parametersHash: hash(parameters),
      maxRows,
      timeoutMs,
      status: rejectionReasons.length > 0 ? "rejected" : "planned",
      referencedRelations: validation.referencedRelations,
      resultColumns: [],
      resultRowCount: null,
      resultHash: null,
      error: rejectionReasons.length > 0 ? rejectionReasons.join("; ") : null,
      startedAt: null,
      completedAt: rejectionReasons.length > 0 ? now : null,
      createdAt: now,
      metadata: { ...(input.metadata ?? {}), validationWarnings: validation.warnings },
    };
    await this.repository.saveQueryRun(run);
    if (rejectionReasons.length > 0) throw new Error(run.error ?? "Query rejected");

    run.status = "running";
    run.startedAt = new Date().toISOString();
    await this.repository.saveQueryRun(run);
    try {
      const rawResult = await this.queryExecutor.execute({
        source,
        sql: validation.normalizedSql,
        parameters,
        maxRows,
        timeoutMs,
      });
      validateRows(rawResult.rows, maxRows * 2);
      const rows = rawResult.rows.slice(0, maxRows);
      const columns = rawResult.columns.length > 0
        ? [...new Set(rawResult.columns)]
        : [...new Set(rows.flatMap((row) => Object.keys(row)))];
      const result: AnalyticsQueryResult = { columns, rows, durationMs: rawResult.durationMs };
      run.status = "succeeded";
      run.resultColumns = columns;
      run.resultRowCount = rows.length;
      run.resultHash = hash(result);
      run.completedAt = new Date().toISOString();
      await this.repository.saveQueryRun(run);
      await this.saveLineage("source", source.id, "query", run.id, "governed-read-only-query", {
        sqlHash: run.sqlHash,
        resultHash: run.resultHash,
      });
      for (const relation of run.referencedRelations) {
        await this.saveLineage("dataset", `${source.id}:${relation}`, "query", run.id, "query-read", {
          relation,
        });
      }
      return { run, result };
    } catch (error) {
      run.status = "failed";
      run.error = error instanceof Error ? error.message : "Query execution failed";
      run.completedAt = new Date().toISOString();
      await this.repository.saveQueryRun(run);
      throw error;
    }
  }

  async listQueryRuns(options: Parameters<AnalyticsRepository["listQueryRuns"]>[0] = {}): Promise<AnalyticsQueryRun[]> {
    return this.repository.listQueryRuns(options);
  }

  async createQualityRule(input: CreateQualityRuleInput): Promise<AnalyticsQualityRule> {
    await this.requireSource(input.sourceId);
    const maximumFailureRatio = input.maximumFailureRatio ?? 0;
    requireRatio(maximumFailureRatio, "maximumFailureRatio");
    const now = new Date().toISOString();
    const id = input.id?.trim() || randomUUID();
    const existing = await this.repository.getQualityRule(id);
    const rule: AnalyticsQualityRule = {
      id,
      sourceId: input.sourceId,
      dataset: input.dataset.trim(),
      name: input.name.trim(),
      kind: input.kind,
      column: input.column.trim(),
      configuration: structuredClone(input.configuration ?? {}),
      maximumFailureRatio,
      active: existing?.active ?? true,
      owner: input.owner.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (!rule.dataset || !rule.name || !rule.column || !rule.owner) {
      throw new Error("Quality rule dataset, name, column, and owner are required");
    }
    await this.repository.saveQualityRule(rule);
    return rule;
  }

  async listQualityRules(options: Parameters<AnalyticsRepository["listQualityRules"]>[0] = {}): Promise<AnalyticsQualityRule[]> {
    return this.repository.listQualityRules(options);
  }

  async runQualityChecks(
    sourceId: string,
    dataset: string,
    rows: AnalyticsRow[],
    executedBy: string,
    ruleIds?: string[],
    metadata: Record<string, unknown> = {},
  ): Promise<AnalyticsQualityRun> {
    await this.requireSource(sourceId);
    validateRows(rows);
    const activeRules = await this.repository.listQualityRules({ sourceId, dataset, active: true, limit: 1_000 });
    const selected = ruleIds && ruleIds.length > 0
      ? activeRules.filter((rule) => new Set(ruleIds).has(rule.id))
      : activeRules;
    if (selected.length === 0) throw new Error("No active quality rules matched this run");
    const results = selected.map((rule) => evaluateQualityRule(rule, rows));
    const run: AnalyticsQualityRun = {
      id: randomUUID(),
      sourceId,
      dataset: dataset.trim(),
      rowCount: rows.length,
      inputHash: hash(rows),
      passed: results.every((result) => result.passed),
      results,
      executedAt: new Date().toISOString(),
      executedBy: executedBy.trim(),
      metadata: structuredClone(metadata),
    };
    await this.repository.saveQualityRun(run);
    await this.saveLineage("dataset", `${sourceId}:${dataset}`, "quality-run", run.id, "data-quality-evaluation", {
      inputHash: run.inputHash,
      ruleIds: selected.map((rule) => rule.id),
    });
    return run;
  }

  async listQualityRuns(options: Parameters<AnalyticsRepository["listQualityRuns"]>[0] = {}): Promise<AnalyticsQualityRun[]> {
    return this.repository.listQualityRuns(options);
  }

  async profileDataset(
    sourceId: string,
    dataset: string,
    rows: AnalyticsRow[],
    profiledBy: string,
    metadata: Record<string, unknown> = {},
  ): Promise<AnalyticsDatasetProfile> {
    await this.requireSource(sourceId);
    validateRows(rows);
    const profile: AnalyticsDatasetProfile = {
      id: randomUUID(),
      sourceId,
      dataset: dataset.trim(),
      rowCount: rows.length,
      inputHash: hash(rows),
      columns: profileRows(rows),
      profiledAt: new Date().toISOString(),
      profiledBy: profiledBy.trim(),
      metadata: structuredClone(metadata),
    };
    await this.repository.saveProfile(profile);
    await this.saveLineage("dataset", `${sourceId}:${dataset}`, "dataset", profile.id, "dataset-profile", {
      inputHash: profile.inputHash,
      rowCount: profile.rowCount,
    });
    return profile;
  }

  async listProfiles(options: Parameters<AnalyticsRepository["listProfiles"]>[0] = {}): Promise<AnalyticsDatasetProfile[]> {
    return this.repository.listProfiles(options);
  }

  async evaluateForecast(input: EvaluateForecastInput): Promise<AnalyticsForecastEvaluation> {
    if (input.sourceId) await this.requireSource(input.sourceId);
    const comparison = evaluateAgainstConstantBaseline(input.actual, input.predicted, input.baselineValue);
    const evaluation: AnalyticsForecastEvaluation = {
      id: randomUUID(),
      sourceId: input.sourceId ?? null,
      dataset: input.dataset.trim(),
      target: input.target.trim(),
      modelName: input.modelName.trim(),
      horizon: input.predicted.length,
      sampleCount: input.actual.length,
      actualHash: hash(input.actual),
      predictedHash: hash(input.predicted),
      mae: comparison.model.mae,
      rmse: comparison.model.rmse,
      mape: comparison.model.mape,
      baselineValue: input.baselineValue,
      baselineMae: comparison.baseline.mae,
      baselineRmse: comparison.baseline.rmse,
      beatsBaseline: comparison.beatsBaseline,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: input.evaluatedBy.trim(),
      metadata: structuredClone(input.metadata ?? {}),
    };
    await this.repository.saveForecastEvaluation(evaluation);
    await this.saveLineage(
      "dataset",
      `${input.sourceId ?? "unregistered"}:${evaluation.dataset}`,
      "forecast",
      evaluation.id,
      "forecast-backtest",
      { actualHash: evaluation.actualHash, predictedHash: evaluation.predictedHash },
    );
    return evaluation;
  }

  async listForecastEvaluations(
    options: Parameters<AnalyticsRepository["listForecastEvaluations"]>[0] = {},
  ): Promise<AnalyticsForecastEvaluation[]> {
    return this.repository.listForecastEvaluations(options);
  }

  async createReport(input: CreateReportInput): Promise<AnalyticsReportDefinition> {
    const metricIds = normalizeList(input.metricIds);
    if (metricIds.length === 0) throw new Error("Report requires at least one metric");
    for (const metricId of metricIds) await this.requireMetric(metricId);
    const now = new Date().toISOString();
    const report: AnalyticsReportDefinition = {
      id: input.id?.trim() || randomUUID(),
      name: input.name.trim(),
      description: input.description.trim(),
      owner: input.owner.trim(),
      metricIds,
      schedule: input.schedule?.trim() || null,
      status: "candidate",
      approvedBy: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveReport(report);
    return report;
  }

  async approveReport(id: string, approvedBy: string): Promise<AnalyticsReportDefinition> {
    const report = await this.requireReport(id);
    if (report.status !== "candidate") throw new Error("Only candidate reports can be approved");
    for (const metricId of report.metricIds) {
      const metric = await this.requireMetric(metricId);
      if (metric.status !== "approved") throw new Error(`Report metric ${metricId} is not approved`);
    }
    report.status = "approved";
    report.approvedBy = approvedBy.trim();
    report.approvedAt = new Date().toISOString();
    report.updatedAt = report.approvedAt;
    await this.repository.saveReport(report);
    return report;
  }

  async buildReportSnapshot(id: string): Promise<AnalyticsReportSnapshot> {
    const report = await this.requireReport(id);
    if (report.status !== "approved") throw new Error("Only approved reports can be generated");
    const observations: AnalyticsMetricObservation[] = [];
    const missingMetricIds: string[] = [];
    for (const metricId of report.metricIds) {
      const observation = await this.repository.latestMetricObservation(metricId);
      if (observation) observations.push(observation);
      else missingMetricIds.push(metricId);
    }
    return { report, generatedAt: new Date().toISOString(), observations, missingMetricIds };
  }

  async listReports(options: Parameters<AnalyticsRepository["listReports"]>[0] = {}): Promise<AnalyticsReportDefinition[]> {
    return this.repository.listReports(options);
  }

  async listLineage(options: Parameters<AnalyticsRepository["listLineage"]>[0] = {}): Promise<AnalyticsLineageEdge[]> {
    return this.repository.listLineage(options);
  }

  async buildMissionContext(sourceId?: string, metricId?: string): Promise<AnalyticsMissionContext> {
    const generatedAt = new Date().toISOString();
    const sources = sourceId ? [await this.requireSource(sourceId)] : await this.repository.listSources();
    const selectedSources = sources.slice(0, 8);
    const metrics = metricId
      ? [await this.requireMetric(metricId)]
      : (await this.repository.listMetrics({ status: "approved", limit: 20 }))
        .filter((metric) => !sourceId || metric.sourceId === sourceId);
    const sections: string[] = [];
    const evidence: AnalyticsMissionContext["evidence"] = [];
    const uncertainties: string[] = [];

    for (const source of selectedSources) {
      const schema = await this.repository.latestSchema(source.id);
      sections.push(
        `Source ${source.name} [${source.id}] kind=${source.kind} status=${source.status} sensitivity=${source.sensitivity} approval=${source.requiresApproval}`,
      );
      evidence.push({
        id: source.id,
        source: `analytics-source:${source.id}`,
        locator: "registry",
        retrievedAt: generatedAt,
      });
      if (schema) {
        const tableSummary = schema.tables.slice(0, 12).map((table) =>
          `${table.namespace ? `${table.namespace}.` : ""}${table.name}(${table.columns.slice(0, 20).map((column) => `${column.name}:${column.dataType}`).join(", ")})`);
        sections.push(`Schema v${schema.version} ${schema.fingerprint.slice(0, 12)}: ${tableSummary.join("; ")}`);
        evidence.push({
          id: schema.id,
          source: `analytics-schema:${source.id}`,
          locator: `version:${schema.version}`,
          retrievedAt: generatedAt,
        });
      } else {
        uncertainties.push(`No schema snapshot exists for source ${source.id}`);
      }
    }

    for (const metric of metrics.slice(0, 20)) {
      sections.push(
        `Approved metric ${metric.name} [${metric.id}] dataset=${metric.dataset} grain=${metric.grain} unit=${metric.unit ?? "none"} calculation=${JSON.stringify(metric.calculation)}`,
      );
      evidence.push({
        id: metric.id,
        source: `analytics-metric:${metric.sourceId}`,
        locator: `version:${metric.version}`,
        retrievedAt: generatedAt,
      });
      const observation = await this.repository.latestMetricObservation(metric.id);
      if (observation) {
        sections.push(`Latest observation ${observation.value} at ${observation.computedAt} from ${observation.rowCount} rows, input ${observation.inputHash.slice(0, 12)}`);
        evidence.push({
          id: observation.id,
          source: `analytics-observation:${metric.id}`,
          locator: observation.inputHash,
          retrievedAt: generatedAt,
        });
      } else {
        uncertainties.push(`Approved metric ${metric.id} has no computed observation`);
      }
    }

    const qualityRuns = await this.repository.listQualityRuns({ sourceId, limit: 10 });
    for (const run of qualityRuns) {
      sections.push(`Quality run ${run.id} dataset=${run.dataset} passed=${run.passed} rows=${run.rowCount} at ${run.executedAt}`);
      evidence.push({
        id: run.id,
        source: `analytics-quality:${run.sourceId}`,
        locator: run.inputHash,
        retrievedAt: generatedAt,
      });
    }

    const forecasts = await this.repository.listForecastEvaluations({ sourceId, limit: 8 });
    for (const forecast of forecasts) {
      sections.push(`Forecast ${forecast.modelName} target=${forecast.target} rmse=${forecast.rmse} baselineRmse=${forecast.baselineRmse} beatsBaseline=${forecast.beatsBaseline}`);
      evidence.push({
        id: forecast.id,
        source: `analytics-forecast:${forecast.sourceId ?? "unregistered"}`,
        locator: forecast.predictedHash,
        retrievedAt: generatedAt,
      });
    }

    if (selectedSources.length === 0) uncertainties.push("No analytics data sources are registered");
    if (metrics.length === 0) uncertainties.push("No approved metric definitions matched this mission");
    return {
      summary: sections.join("\n").slice(0, 24_000),
      generatedAt,
      evidence,
      uncertainties,
    };
  }

  private async saveLineage(
    fromKind: AnalyticsLineageEdge["fromKind"],
    fromId: string,
    toKind: AnalyticsLineageEdge["toKind"],
    toId: string,
    transformation: string,
    evidence: Record<string, unknown>,
  ): Promise<void> {
    await this.repository.saveLineage({
      id: randomUUID(),
      fromKind,
      fromId,
      toKind,
      toId,
      transformation,
      evidence: structuredClone(evidence),
      createdAt: new Date().toISOString(),
    });
  }

  private async requireSource(id: string): Promise<AnalyticsDataSource> {
    const source = await this.repository.getSource(id);
    if (!source) throw new Error(`Analytics source not found: ${id}`);
    return source;
  }

  private async requireMetric(id: string): Promise<AnalyticsMetricDefinition> {
    const metric = await this.repository.getMetric(id);
    if (!metric) throw new Error(`Analytics metric not found: ${id}`);
    return metric;
  }

  private async requireReport(id: string): Promise<AnalyticsReportDefinition> {
    const report = await this.repository.getReport(id);
    if (!report) throw new Error(`Analytics report not found: ${id}`);
    return report;
  }
}
