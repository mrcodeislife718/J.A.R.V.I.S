import assert from "node:assert/strict";
import test from "node:test";
import { PostgresAnalyticsRepository } from "../../src/analytics/postgres-repository.js";
import { RefusingAnalyticsQueryExecutor } from "../../src/analytics/query-executor.js";
import { AnalyticsService } from "../../src/analytics/service.js";
import { createPostgresPool, runMigrations } from "../../src/storage/postgres.js";

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  test("PostgreSQL analytics persistence requires TEST_DATABASE_URL", { skip: true }, () => undefined);
} else {
  test("governed analytics state survives a PostgreSQL repository restart", async () => {
    const firstPool = createPostgresPool(connectionString);
    await runMigrations(firstPool);
    await firstPool.query(`TRUNCATE
      analytics_lineage,
      analytics_forecast_evaluations,
      analytics_reports,
      analytics_dataset_profiles,
      analytics_quality_runs,
      analytics_quality_rules,
      analytics_query_runs,
      analytics_metric_observations,
      analytics_metrics,
      analytics_schema_snapshots,
      analytics_sources
      RESTART IDENTITY CASCADE`);

    const firstService = new AnalyticsService(
      new PostgresAnalyticsRepository(firstPool),
      new RefusingAnalyticsQueryExecutor(),
      { maxRows: 1_000, timeoutMs: 30_000 },
    );
    await firstService.createSource({
      id: "persistent-analytics-source",
      name: "Persistent analytics source",
      kind: "manual",
      owner: "postgres-test",
      sensitivity: "internal",
    });
    await firstService.createSchemaSnapshot({
      sourceId: "persistent-analytics-source",
      observedBy: "postgres-test",
      tables: [{
        namespace: null,
        name: "sales",
        kind: "table",
        estimatedRows: 3,
        columns: [
          { name: "revenue", dataType: "number", nullable: false, primaryKey: false, description: null, metadata: {} },
        ],
        metadata: {},
      }],
    });
    await firstService.createMetric({
      id: "persistent-revenue",
      sourceId: "persistent-analytics-source",
      dataset: "sales",
      name: "Persistent revenue",
      description: "Persistence test metric.",
      owner: "postgres-test",
      grain: "test run",
      unit: "USD",
      calculation: { type: "sum", column: "revenue" },
    });
    await firstService.reviewMetric(
      "persistent-revenue",
      "approve",
      "Charles Castillo",
      "Definition verified for persistence testing.",
    );
    await firstService.calculateMetric(
      "persistent-revenue",
      [{ revenue: 100 }, { revenue: 200 }, { revenue: 50 }],
      "postgres-test",
    );
    await firstService.createQualityRule({
      id: "persistent-revenue-range",
      sourceId: "persistent-analytics-source",
      dataset: "sales",
      name: "Revenue is nonnegative",
      kind: "range",
      column: "revenue",
      configuration: { minimum: 0 },
      owner: "postgres-test",
    });
    await firstService.runQualityChecks(
      "persistent-analytics-source",
      "sales",
      [{ revenue: 100 }, { revenue: 200 }, { revenue: 50 }],
      "postgres-test",
    );
    await firstService.profileDataset(
      "persistent-analytics-source",
      "sales",
      [{ revenue: 100 }, { revenue: 200 }, { revenue: 50 }],
      "postgres-test",
    );
    await firstService.evaluateForecast({
      sourceId: "persistent-analytics-source",
      dataset: "sales",
      target: "revenue",
      modelName: "persistence-candidate",
      actual: [100, 120, 140],
      predicted: [101, 119, 139],
      baselineValue: 80,
      evaluatedBy: "postgres-test",
    });
    await firstService.createReport({
      id: "persistent-report",
      name: "Persistent report",
      description: "Persistence test report.",
      owner: "postgres-test",
      metricIds: ["persistent-revenue"],
      schedule: "weekly",
    });
    await firstService.approveReport("persistent-report", "Charles Castillo");
    await firstPool.end();

    const secondPool = createPostgresPool(connectionString);
    const secondService = new AnalyticsService(
      new PostgresAnalyticsRepository(secondPool),
      new RefusingAnalyticsQueryExecutor(),
      { maxRows: 1_000, timeoutMs: 30_000 },
    );
    const sources = await secondService.listSources();
    assert.equal(sources[0]?.id, "persistent-analytics-source");
    const schema = await secondService.latestSchema("persistent-analytics-source");
    assert.equal(schema?.version, 1);
    assert.equal(schema?.tables[0]?.name, "sales");
    const metrics = await secondService.listMetrics({ status: "approved" });
    assert.equal(metrics[0]?.id, "persistent-revenue");
    const observations = await secondService.listMetricObservations("persistent-revenue");
    assert.equal(observations[0]?.value, 350);
    const qualityRuns = await secondService.listQualityRuns({ sourceId: "persistent-analytics-source" });
    assert.equal(qualityRuns[0]?.passed, true);
    const profiles = await secondService.listProfiles({ sourceId: "persistent-analytics-source" });
    assert.equal(profiles[0]?.rowCount, 3);
    const forecasts = await secondService.listForecastEvaluations({ sourceId: "persistent-analytics-source" });
    assert.equal(forecasts[0]?.beatsBaseline, true);
    const reports = await secondService.listReports({ status: "approved" });
    assert.equal(reports[0]?.id, "persistent-report");
    const snapshot = await secondService.buildReportSnapshot("persistent-report");
    assert.equal(snapshot.observations[0]?.value, 350);
    const lineage = await secondService.listLineage({ fromId: "persistent-analytics-source" });
    assert.ok(lineage.length >= 2);
    await secondPool.end();
  });
}
