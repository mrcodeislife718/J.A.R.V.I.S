import type { AnalyticsDataSource, AnalyticsQueryResult, AnalyticsScalar } from "./types.js";

export interface AnalyticsQueryExecutionRequest {
  source: AnalyticsDataSource;
  sql: string;
  parameters: AnalyticsScalar[];
  maxRows: number;
  timeoutMs: number;
}

export interface AnalyticsQueryExecutor {
  execute(request: AnalyticsQueryExecutionRequest): Promise<AnalyticsQueryResult>;
}

export class RefusingAnalyticsQueryExecutor implements AnalyticsQueryExecutor {
  async execute(_request: AnalyticsQueryExecutionRequest): Promise<AnalyticsQueryResult> {
    throw new Error(
      "No governed read-only data connector is installed. Validation and planning are available, but live source execution is disabled.",
    );
  }
}
