import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../src/app.js";
import { InMemoryAnalyticsRepository } from "../../src/analytics/in-memory-repository.js";
import type {
  AnalyticsQueryExecutionRequest,
  AnalyticsQueryExecutor,
} from "../../src/analytics/query-executor.js";
import type { AnalyticsQueryResult } from "../../src/analytics/types.js";
import type { ModelClient, ModelRequest, ModelResponse } from "../../src/core/types.js";

class FakeQueryExecutor implements AnalyticsQueryExecutor {
  calls: AnalyticsQueryExecutionRequest[] = [];

  async execute(request: AnalyticsQueryExecutionRequest): Promise<AnalyticsQueryResult> {
    this.calls.push(structuredClone(request));
    return {
      columns: ["customer_id", "revenue"],
      rows: [
        { customer_id: "c1", revenue: 100 },
        { customer_id: "c2", revenue: 250 },
      ],
      durationMs: 7,
    };
  }
}

class CapturingModelClient implements ModelClient {
  prompts: string[] = [];

  async generate(request: ModelRequest): Promise<ModelResponse> {
    this.prompts.push(request.prompt);
    const capability = request.prompt.match(/CURRENT CAPABILITY: ([^\n]+)/)?.[1] ?? "unknown";
    const text = capability === "core.report"
      ? "Known: governed analytics context was supplied. Missing: no causal design was provided."
      : `Known: processed ${capability}. Missing: no causal design was provided.`;
    return { text, model: request.model, inputTokens: 100, outputTokens: 30, totalDurationMs: 5 };
  }
}

const createSource = async (app: ReturnType<typeof buildApp>, requiresApproval = false): Promise<void> => {
  const response = await app.inject({
    method: "POST",
    url: "/v1/analytics/sources",
    payload: {
      id: "sales-source",
      name: "Sales warehouse",
      kind: "postgres",
      sensitivity: requiresApproval ? "confidential" : "internal",
      requiresApproval,
      endpointLabel: "primary reporting replica",
      credentialRef: "env:SALES_READONLY_DATABASE_URL",
      owner: "Charles Castillo",
      tags: ["sales", "read-only"],
    },
  });
  assert.equal(response.statusCode, 201);
};

test("SQL validation rejects writes, locking, and multiple statements", async () => {
  const app = buildApp({
    modelClient: new CapturingModelClient(),
    analyticsRepository: new InMemoryAnalyticsRepository(),
    analyticsQueryExecutor: new FakeQueryExecutor(),
    logger: false,
  });

  const accepted = await app.inject({
    method: "POST",
    url: "/v1/analytics/sql/validate",
    payload: { sql: "WITH totals AS (SELECT revenue FROM sales) SELECT sum(revenue) FROM totals" },
  });
  assert.equal(accepted.statusCode, 200);
  assert.equal(accepted.json().validation.accepted, true);

  for (const sql of [
    "UPDATE sales SET revenue = 0",
    "SELECT * FROM sales FOR UPDATE",
    "SELECT 1; DROP TABLE sales",
    "WITH changed AS (DELETE FROM sales RETURNING *) SELECT * FROM changed",
  ]) {
    const response = await app.inject({
      method: "POST",
      url: "/v1/analytics/sql/validate",
      payload: { sql },
    });
    assert.equal(response.json().validation.accepted, false);
  }
  await app.close();
});

test("approved metrics calculate reproducibly and feed approved reports", async () => {
  const app = buildApp({
    modelClient: new CapturingModelClient(),
    analyticsRepository: new InMemoryAnalyticsRepository(),
    analyticsQueryExecutor: new FakeQueryExecutor(),
    logger: false,
  });
  await createSource(app);

  const metricResponse = await app.inject({
    method: "POST",
    url: "/v1/analytics/metrics",
    payload: {
      id: "total-revenue",
      sourceId: "sales-source",
      dataset: "public.sales",
      name: "Total revenue",
      description: "Sum of verified revenue values in the supplied reporting dataset.",
      owner: "Charles Castillo",
      unit: "USD",
      grain: "reporting period",
      calculation: { type: "sum", column: "revenue" },
    },
  });
  assert.equal(metricResponse.statusCode, 201);
  assert.equal(metricResponse.json().metric.status, "candidate");

  const premature = await app.inject({
    method: "POST",
    url: "/v1/analytics/metrics/total-revenue/calculate",
    payload: { rows: [{ revenue: 100 }], computedBy: "test" },
  });
  assert.equal(premature.statusCode, 400);

  const approved = await app.inject({
    method: "POST",
    url: "/v1/analytics/metrics/total-revenue/approve",
    payload: { reviewedBy: "Charles Castillo", reason: "Definition and unit verified." },
  });
  assert.equal(approved.statusCode, 200);
  assert.equal(approved.json().metric.status, "approved");

  const calculation = await app.inject({
    method: "POST",
    url: "/v1/analytics/metrics/total-revenue/calculate",
    payload: {
      rows: [{ revenue: 100 }, { revenue: 250 }, { revenue: null }],
      computedBy: "analytics-test",
    },
  });
  assert.equal(calculation.statusCode, 201);
  assert.equal(calculation.json().observation.value, 350);
  assert.equal(calculation.json().observation.rowCount, 3);

  const report = await app.inject({
    method: "POST",
    url: "/v1/analytics/reports",
    payload: {
      id: "weekly-operations",
      name: "Weekly operations",
      description: "Approved weekly metric package.",
      owner: "Charles Castillo",
      metricIds: ["total-revenue"],
      schedule: "weekly",
    },
  });
  assert.equal(report.statusCode, 201);
  await app.inject({
    method: "POST",
    url: "/v1/analytics/reports/weekly-operations/approve",
    payload: { approvedBy: "Charles Castillo" },
  });
  const snapshot = await app.inject({
    method: "GET",
    url: "/v1/analytics/reports/weekly-operations/snapshot",
  });
  assert.equal(snapshot.statusCode, 200);
  assert.equal(snapshot.json().snapshot.observations[0].value, 350);
  assert.deepEqual(snapshot.json().snapshot.missingMetricIds, []);
  await app.close();
});

test("quality checks, profiles, and forecast evaluation remain deterministic", async () => {
  const app = buildApp({
    modelClient: new CapturingModelClient(),
    analyticsRepository: new InMemoryAnalyticsRepository(),
    analyticsQueryExecutor: new FakeQueryExecutor(),
    logger: false,
  });
  await createSource(app);

  for (const rule of [
    {
      id: "customer-required",
      kind: "not-null",
      column: "customer_id",
      configuration: {},
      maximumFailureRatio: 0,
    },
    {
      id: "revenue-range",
      kind: "range",
      column: "revenue",
      configuration: { minimum: 0, maximum: 1000 },
      maximumFailureRatio: 0,
    },
  ]) {
    const response = await app.inject({
      method: "POST",
      url: "/v1/analytics/quality/rules",
      payload: {
        ...rule,
        sourceId: "sales-source",
        dataset: "public.sales",
        name: rule.id,
        owner: "analytics-test",
      },
    });
    assert.equal(response.statusCode, 201);
  }

  const rows = [
    { customer_id: "c1", revenue: 100 },
    { customer_id: null, revenue: 1500 },
  ];
  const quality = await app.inject({
    method: "POST",
    url: "/v1/analytics/quality/runs",
    payload: {
      sourceId: "sales-source",
      dataset: "public.sales",
      rows,
      executedBy: "analytics-test",
    },
  });
  assert.equal(quality.statusCode, 201);
  assert.equal(quality.json().run.passed, false);
  assert.equal(quality.json().run.results.length, 2);

  const profile = await app.inject({
    method: "POST",
    url: "/v1/analytics/profiles",
    payload: {
      sourceId: "sales-source",
      dataset: "public.sales",
      rows,
      profiledBy: "analytics-test",
    },
  });
  assert.equal(profile.statusCode, 201);
  const revenue = profile.json().profile.columns.find((column: { name: string }) => column.name === "revenue");
  assert.equal(revenue.numericMaximum, 1500);

  const forecast = await app.inject({
    method: "POST",
    url: "/v1/analytics/forecasts/evaluate",
    payload: {
      sourceId: "sales-source",
      dataset: "public.sales",
      target: "revenue",
      modelName: "candidate-model",
      actual: [100, 120, 140],
      predicted: [102, 119, 141],
      baselineValue: 80,
      evaluatedBy: "analytics-test",
    },
  });
  assert.equal(forecast.statusCode, 201);
  assert.equal(forecast.json().evaluation.beatsBaseline, true);
  assert.ok(forecast.json().evaluation.rmse < forecast.json().evaluation.baselineRmse);
  await app.close();
});

test("confidential query execution requires authorization and preserves lineage", async () => {
  const executor = new FakeQueryExecutor();
  const app = buildApp({
    modelClient: new CapturingModelClient(),
    analyticsRepository: new InMemoryAnalyticsRepository(),
    analyticsQueryExecutor: executor,
    logger: false,
  });
  await createSource(app, true);

  const denied = await app.inject({
    method: "POST",
    url: "/v1/analytics/queries",
    payload: {
      sourceId: "sales-source",
      sql: "SELECT customer_id, revenue FROM public.sales WHERE revenue > $1 ORDER BY revenue DESC LIMIT 10",
      parameters: [50],
      purpose: "Prepare an internal revenue summary",
      requestedBy: "analytics-test",
    },
  });
  assert.equal(denied.statusCode, 400);
  assert.equal(executor.calls.length, 0);

  const allowed = await app.inject({
    method: "POST",
    url: "/v1/analytics/queries",
    payload: {
      sourceId: "sales-source",
      sql: "SELECT customer_id, revenue FROM public.sales WHERE revenue > $1 ORDER BY revenue DESC LIMIT 10",
      parameters: [50],
      purpose: "Prepare an internal revenue summary",
      requestedBy: "analytics-test",
      authorizedBy: "Charles Castillo",
    },
  });
  assert.equal(allowed.statusCode, 201);
  assert.equal(allowed.json().run.status, "succeeded");
  assert.equal(allowed.json().result.rows.length, 2);
  assert.equal(executor.calls.length, 1);

  const lineage = await app.inject({ method: "GET", url: "/v1/analytics/lineage" });
  assert.equal(lineage.statusCode, 200);
  assert.ok(lineage.json().lineage.some((edge: { transformation: string }) => edge.transformation === "governed-read-only-query"));
  await app.close();
});

test("approved analytics state reaches analytics missions", async () => {
  const model = new CapturingModelClient();
  const app = buildApp({
    modelClient: model,
    analyticsRepository: new InMemoryAnalyticsRepository(),
    analyticsQueryExecutor: new FakeQueryExecutor(),
    logger: false,
  });
  await createSource(app);
  await app.inject({
    method: "POST",
    url: "/v1/analytics/sources/sales-source/schemas",
    payload: {
      observedBy: "analytics-test",
      tables: [{
        namespace: "public",
        name: "sales",
        kind: "table",
        estimatedRows: 1000,
        columns: [
          { name: "customer_id", dataType: "text", nullable: false, primaryKey: false, description: null, metadata: {} },
          { name: "revenue", dataType: "numeric", nullable: false, primaryKey: false, description: null, metadata: {} },
        ],
        metadata: {},
      }],
    },
  });

  const mission = await app.inject({
    method: "POST",
    url: "/v1/missions",
    payload: {
      domain: "analytics",
      objective: "Inspect the registered sales schema and identify data-quality requirements",
      requestedCapabilities: ["analytics.schema-inspect"],
      inputs: { sourceId: "sales-source" },
    },
  });
  assert.equal(mission.statusCode, 201);
  assert.equal(mission.json().mission.status, "completed");
  assert.ok(model.prompts.some((prompt) => prompt.includes("Sales warehouse [sales-source]")));
  assert.ok(model.prompts.some((prompt) => prompt.includes("public.sales")));
  await app.close();
});
