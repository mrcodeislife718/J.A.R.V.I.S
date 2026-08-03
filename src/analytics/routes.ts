import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import type { AnalyticsService } from "./service.js";
import {
  ANALYTICS_METRIC_STATUSES,
  ANALYTICS_QUALITY_RULE_KINDS,
  ANALYTICS_QUERY_STATUSES,
  ANALYTICS_REPORT_STATUSES,
  ANALYTICS_SENSITIVITIES,
  ANALYTICS_SOURCE_KINDS,
} from "./types.js";

const scalarSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);
const rowSchema = z.record(z.string(), scalarSchema);
const metadataSchema = z.record(z.string(), z.unknown()).default({});

const sourceSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(300),
  description: z.string().max(5_000).optional(),
  kind: z.enum(ANALYTICS_SOURCE_KINDS),
  sensitivity: z.enum(ANALYTICS_SENSITIVITIES).optional(),
  requiresApproval: z.boolean().optional(),
  endpointLabel: z.string().max(1_000).optional(),
  credentialRef: z.string().max(500).optional(),
  owner: z.string().min(1).max(300),
  tags: z.array(z.string().min(1).max(100)).max(100).optional(),
  metadata: metadataSchema,
});

const columnSchema = z.object({
  name: z.string().min(1).max(300),
  dataType: z.string().min(1).max(300),
  nullable: z.boolean(),
  primaryKey: z.boolean().default(false),
  description: z.string().max(2_000).nullable().default(null),
  metadata: metadataSchema,
});

const tableSchema = z.object({
  namespace: z.string().max(300).nullable().default(null),
  name: z.string().min(1).max(300),
  kind: z.enum(["table", "view", "file", "stream", "sheet", "collection"]),
  columns: z.array(columnSchema).min(1).max(2_000),
  estimatedRows: z.number().int().nonnegative().nullable().default(null),
  metadata: metadataSchema,
});

const schemaSnapshotSchema = z.object({
  tables: z.array(tableSchema).min(1).max(1_000),
  observedBy: z.string().min(1).max(300),
  metadata: metadataSchema,
});

const calculationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("count"), column: z.string().min(1).nullable(), distinct: z.boolean().default(false) }),
  z.object({ type: z.enum(["sum", "average", "minimum", "maximum"]), column: z.string().min(1) }),
  z.object({
    type: z.literal("ratio"),
    numeratorColumn: z.string().min(1),
    denominatorColumn: z.string().min(1),
    multiplier: z.number().finite().default(1),
  }),
]);

const metricSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  sourceId: z.string().min(1).max(200),
  dataset: z.string().min(1).max(500),
  name: z.string().min(1).max(300),
  description: z.string().min(1).max(5_000),
  owner: z.string().min(1).max(300),
  unit: z.string().max(100).optional(),
  grain: z.string().min(1).max(300),
  dimensions: z.array(z.string().min(1).max(300)).max(100).optional(),
  filters: z.record(z.string(), scalarSchema).optional(),
  calculation: calculationSchema,
});

const reviewSchema = z.object({
  reviewedBy: z.string().min(1).max(300),
  reason: z.string().min(3).max(5_000),
});

const calculateMetricSchema = z.object({
  rows: z.array(rowSchema).max(50_000),
  computedBy: z.string().min(1).max(300),
  dimensions: z.record(z.string(), scalarSchema).default({}),
  metadata: metadataSchema,
});

const querySchema = z.object({
  sourceId: z.string().min(1).max(200),
  sql: z.string().min(1).max(100_000),
  parameters: z.array(scalarSchema).max(1_000).optional(),
  purpose: z.string().min(3).max(5_000),
  requestedBy: z.string().min(1).max(300),
  authorizedBy: z.string().min(1).max(300).optional(),
  maxRows: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
  metadata: metadataSchema,
});

const qualityRuleSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  sourceId: z.string().min(1).max(200),
  dataset: z.string().min(1).max(500),
  name: z.string().min(1).max(300),
  kind: z.enum(ANALYTICS_QUALITY_RULE_KINDS),
  column: z.string().min(1).max(300),
  configuration: z.record(z.string(), z.unknown()).default({}),
  maximumFailureRatio: z.number().min(0).max(1).optional(),
  owner: z.string().min(1).max(300),
});

const qualityRunSchema = z.object({
  sourceId: z.string().min(1).max(200),
  dataset: z.string().min(1).max(500),
  rows: z.array(rowSchema).max(50_000),
  executedBy: z.string().min(1).max(300),
  ruleIds: z.array(z.string().min(1).max(200)).max(1_000).optional(),
  metadata: metadataSchema,
});

const profileSchema = z.object({
  sourceId: z.string().min(1).max(200),
  dataset: z.string().min(1).max(500),
  rows: z.array(rowSchema).max(50_000),
  profiledBy: z.string().min(1).max(300),
  metadata: metadataSchema,
});

const forecastSchema = z.object({
  sourceId: z.string().min(1).max(200).optional(),
  dataset: z.string().min(1).max(500),
  target: z.string().min(1).max(300),
  modelName: z.string().min(1).max(300),
  actual: z.array(z.number().finite()).min(1).max(100_000),
  predicted: z.array(z.number().finite()).min(1).max(100_000),
  baselineValue: z.number().finite(),
  evaluatedBy: z.string().min(1).max(300),
  metadata: metadataSchema,
});

const reportSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(300),
  description: z.string().min(1).max(5_000),
  owner: z.string().min(1).max(300),
  metricIds: z.array(z.string().min(1).max(200)).min(1).max(200),
  schedule: z.string().max(500).optional(),
});

const sendError = (reply: FastifyReply, error: unknown): FastifyReply =>
  reply.code(400).send({ error: error instanceof Error ? error.message : "Analytics operation failed" });

export const registerAnalyticsRoutes = (app: FastifyInstance, service: AnalyticsService): void => {
  app.post("/v1/analytics/sources", async (request, reply) => {
    const parsed = sourceSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid analytics source", detail: parsed.error.flatten() });
    try {
      return reply.code(201).send({ source: await service.createSource(parsed.data) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/v1/analytics/sources", async () => ({ sources: await service.listSources() }));

  app.get("/v1/analytics/sources/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const source = await service.getSource(id);
    return source ? { source } : reply.code(404).send({ error: "Analytics source not found" });
  });

  app.post("/v1/analytics/sources/:id/disable", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return { source: await service.disableSource(id) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/v1/analytics/sources/:id/schemas", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = schemaSnapshotSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid schema snapshot", detail: parsed.error.flatten() });
    try {
      return reply.code(201).send({ schema: await service.createSchemaSnapshot({ sourceId: id, ...parsed.data }) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/v1/analytics/sources/:id/schemas", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = z.object({ limit: z.coerce.number().int().positive().max(1_000).default(100) }).parse(request.query);
    try {
      return { schemas: await service.listSchemas(id, query.limit) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/v1/analytics/sources/:id/schema", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return { schema: await service.latestSchema(id) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/v1/analytics/sql/validate", async (request, reply) => {
    const parsed = z.object({ sql: z.string().min(1).max(100_000) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid SQL validation request", detail: parsed.error.flatten() });
    return { validation: service.validateSql(parsed.data.sql) };
  });

  app.post("/v1/analytics/queries", async (request, reply) => {
    const parsed = querySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid analytics query", detail: parsed.error.flatten() });
    try {
      return reply.code(201).send(await service.executeQuery(parsed.data));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/v1/analytics/queries", async (request) => {
    const query = z.object({
      sourceId: z.string().optional(),
      status: z.enum(ANALYTICS_QUERY_STATUSES).optional(),
      limit: z.coerce.number().int().positive().max(1_000).default(200),
    }).parse(request.query);
    return { runs: await service.listQueryRuns(query) };
  });

  app.post("/v1/analytics/metrics", async (request, reply) => {
    const parsed = metricSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid metric definition", detail: parsed.error.flatten() });
    try {
      return reply.code(201).send({ metric: await service.createMetric(parsed.data) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/v1/analytics/metrics", async (request) => {
    const query = z.object({
      sourceId: z.string().optional(),
      status: z.enum(ANALYTICS_METRIC_STATUSES).optional(),
      limit: z.coerce.number().int().positive().max(1_000).default(200),
    }).parse(request.query);
    return { metrics: await service.listMetrics(query) };
  });

  for (const decision of ["approve", "reject", "deprecate"] as const) {
    app.post(`/v1/analytics/metrics/:id/${decision}`, async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = reviewSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: "Invalid metric review", detail: parsed.error.flatten() });
      try {
        return { metric: await service.reviewMetric(id, decision, parsed.data.reviewedBy, parsed.data.reason) };
      } catch (error) {
        return sendError(reply, error);
      }
    });
  }

  app.post("/v1/analytics/metrics/:id/calculate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = calculateMetricSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid metric calculation", detail: parsed.error.flatten() });
    try {
      return reply.code(201).send({
        observation: await service.calculateMetric(
          id,
          parsed.data.rows,
          parsed.data.computedBy,
          parsed.data.dimensions,
          parsed.data.metadata,
        ),
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/v1/analytics/metrics/:id/observations", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = z.object({ limit: z.coerce.number().int().positive().max(1_000).default(100) }).parse(request.query);
    try {
      return { observations: await service.listMetricObservations(id, query.limit) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/v1/analytics/quality/rules", async (request, reply) => {
    const parsed = qualityRuleSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid quality rule", detail: parsed.error.flatten() });
    try {
      return reply.code(201).send({ rule: await service.createQualityRule(parsed.data) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/v1/analytics/quality/rules", async (request) => {
    const query = z.object({
      sourceId: z.string().optional(),
      dataset: z.string().optional(),
      active: z.coerce.boolean().optional(),
      limit: z.coerce.number().int().positive().max(1_000).default(200),
    }).parse(request.query);
    return { rules: await service.listQualityRules(query) };
  });

  app.post("/v1/analytics/quality/runs", async (request, reply) => {
    const parsed = qualityRunSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid quality run", detail: parsed.error.flatten() });
    try {
      return reply.code(201).send({
        run: await service.runQualityChecks(
          parsed.data.sourceId,
          parsed.data.dataset,
          parsed.data.rows,
          parsed.data.executedBy,
          parsed.data.ruleIds,
          parsed.data.metadata,
        ),
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/v1/analytics/quality/runs", async (request) => {
    const query = z.object({
      sourceId: z.string().optional(),
      dataset: z.string().optional(),
      limit: z.coerce.number().int().positive().max(1_000).default(200),
    }).parse(request.query);
    return { runs: await service.listQualityRuns(query) };
  });

  app.post("/v1/analytics/profiles", async (request, reply) => {
    const parsed = profileSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid profile request", detail: parsed.error.flatten() });
    try {
      return reply.code(201).send({
        profile: await service.profileDataset(
          parsed.data.sourceId,
          parsed.data.dataset,
          parsed.data.rows,
          parsed.data.profiledBy,
          parsed.data.metadata,
        ),
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/v1/analytics/profiles", async (request) => {
    const query = z.object({
      sourceId: z.string().optional(),
      dataset: z.string().optional(),
      limit: z.coerce.number().int().positive().max(1_000).default(200),
    }).parse(request.query);
    return { profiles: await service.listProfiles(query) };
  });

  app.post("/v1/analytics/forecasts/evaluate", async (request, reply) => {
    const parsed = forecastSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid forecast evaluation", detail: parsed.error.flatten() });
    try {
      return reply.code(201).send({ evaluation: await service.evaluateForecast(parsed.data) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/v1/analytics/forecasts", async (request) => {
    const query = z.object({
      sourceId: z.string().optional(),
      dataset: z.string().optional(),
      limit: z.coerce.number().int().positive().max(1_000).default(200),
    }).parse(request.query);
    return { evaluations: await service.listForecastEvaluations(query) };
  });

  app.post("/v1/analytics/reports", async (request, reply) => {
    const parsed = reportSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid report definition", detail: parsed.error.flatten() });
    try {
      return reply.code(201).send({ report: await service.createReport(parsed.data) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/v1/analytics/reports", async (request) => {
    const query = z.object({
      status: z.enum(ANALYTICS_REPORT_STATUSES).optional(),
      limit: z.coerce.number().int().positive().max(1_000).default(200),
    }).parse(request.query);
    return { reports: await service.listReports(query) };
  });

  app.post("/v1/analytics/reports/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = z.object({ approvedBy: z.string().min(1).max(300) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid report approval", detail: parsed.error.flatten() });
    try {
      return { report: await service.approveReport(id, parsed.data.approvedBy) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/v1/analytics/reports/:id/snapshot", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return { snapshot: await service.buildReportSnapshot(id) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/v1/analytics/lineage", async (request) => {
    const query = z.object({
      fromId: z.string().optional(),
      toId: z.string().optional(),
      limit: z.coerce.number().int().positive().max(5_000).default(500),
    }).parse(request.query);
    return { lineage: await service.listLineage(query) };
  });
};
