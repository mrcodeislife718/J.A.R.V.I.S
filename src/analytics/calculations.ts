import type {
  AnalyticsColumnProfile,
  AnalyticsMetricCalculation,
  AnalyticsQualityRule,
  AnalyticsQualityRuleResult,
  AnalyticsRow,
  AnalyticsScalar,
} from "./types.js";

const scalarKey = (value: unknown): string => `${typeof value}:${JSON.stringify(value)}`;
const isMissing = (value: unknown): boolean => value === null || value === undefined || value === "";
const finiteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const filterRows = (
  rows: AnalyticsRow[],
  filters: Record<string, AnalyticsScalar>,
): AnalyticsRow[] => rows.filter((row) =>
  Object.entries(filters).every(([column, expected]) => row[column] === expected));

export const calculateMetricValue = (
  calculation: AnalyticsMetricCalculation,
  rows: AnalyticsRow[],
): number => {
  if (calculation.type === "count") {
    if (calculation.column === null) return rows.length;
    const values = rows
      .map((row) => row[calculation.column ?? ""])
      .filter((value) => !isMissing(value));
    return calculation.distinct ? new Set(values.map(scalarKey)).size : values.length;
  }

  if (calculation.type === "ratio") {
    const numerator = rows.reduce((sum, row) => sum + (finiteNumber(row[calculation.numeratorColumn]) ?? 0), 0);
    const denominator = rows.reduce((sum, row) => sum + (finiteNumber(row[calculation.denominatorColumn]) ?? 0), 0);
    if (denominator === 0) throw new Error("Metric denominator is zero");
    return (numerator / denominator) * calculation.multiplier;
  }

  const values = rows
    .map((row) => finiteNumber(row[calculation.column]))
    .filter((value): value is number => value !== null);
  if (calculation.type === "sum") return values.reduce((sum, value) => sum + value, 0);
  if (values.length === 0) throw new Error(`Metric column ${calculation.column} contains no finite numeric values`);
  if (calculation.type === "average") {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  if (calculation.type === "minimum") return Math.min(...values);
  return Math.max(...values);
};

export const profileRows = (rows: AnalyticsRow[]): AnalyticsColumnProfile[] => {
  const columnNames = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
  return columnNames.map((name) => {
    const values = rows.map((row) => row[name] ?? null);
    const nonNull = values.filter((value) => !isMissing(value));
    const numeric = nonNull.map(finiteNumber).filter((value): value is number => value !== null);
    const uniqueExamples: AnalyticsScalar[] = [];
    const seen = new Set<string>();
    for (const value of nonNull) {
      const key = scalarKey(value);
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueExamples.push(value as AnalyticsScalar);
      if (uniqueExamples.length >= 5) break;
    }
    return {
      name,
      nonNullCount: nonNull.length,
      nullCount: values.length - nonNull.length,
      distinctCount: new Set(nonNull.map(scalarKey)).size,
      numericMinimum: numeric.length > 0 ? Math.min(...numeric) : null,
      numericMaximum: numeric.length > 0 ? Math.max(...numeric) : null,
      numericMean: numeric.length > 0
        ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length
        : null,
      examples: uniqueExamples,
    };
  });
};

const failure = (
  rowIndex: number,
  value: unknown,
  reason: string,
): { rowIndex: number; value: AnalyticsScalar; reason: string } => ({
  rowIndex,
  value: value === undefined ? null : value as AnalyticsScalar,
  reason,
});

export const evaluateQualityRule = (
  rule: AnalyticsQualityRule,
  rows: AnalyticsRow[],
  referenceTime = new Date(),
): AnalyticsQualityRuleResult => {
  const examples: AnalyticsQualityRuleResult["examples"] = [];
  let failedRows = 0;
  const uniqueValues = new Map<string, number>();
  const accepted = Array.isArray(rule.configuration.values)
    ? new Set(rule.configuration.values.map(scalarKey))
    : new Set<string>();
  const minimum = typeof rule.configuration.minimum === "number" ? rule.configuration.minimum : null;
  const maximum = typeof rule.configuration.maximum === "number" ? rule.configuration.maximum : null;
  const maximumAgeMs = typeof rule.configuration.maximumAgeMs === "number"
    ? rule.configuration.maximumAgeMs
    : null;
  const ignoreNulls = rule.configuration.ignoreNulls !== false;

  rows.forEach((row, rowIndex) => {
    const value = row[rule.column];
    let reason: string | null = null;
    if (rule.kind === "not-null") {
      if (isMissing(value)) reason = `${rule.column} is missing`;
    } else if (rule.kind === "unique") {
      if (!(ignoreNulls && isMissing(value))) {
        const key = scalarKey(value);
        const firstIndex = uniqueValues.get(key);
        if (firstIndex === undefined) uniqueValues.set(key, rowIndex);
        else reason = `${rule.column} duplicates row ${firstIndex}`;
      }
    } else if (rule.kind === "range") {
      const numeric = finiteNumber(value);
      if (numeric === null) reason = `${rule.column} is not a finite number`;
      else if (minimum !== null && numeric < minimum) reason = `${rule.column} is below ${minimum}`;
      else if (maximum !== null && numeric > maximum) reason = `${rule.column} is above ${maximum}`;
    } else if (rule.kind === "accepted-values") {
      if (!accepted.has(scalarKey(value))) reason = `${rule.column} is not an accepted value`;
    } else if (rule.kind === "freshness") {
      if (maximumAgeMs === null || maximumAgeMs < 0) {
        reason = "Freshness rule is missing a non-negative maximumAgeMs";
      } else {
        const observed = typeof value === "number" ? new Date(value) : new Date(String(value));
        if (!Number.isFinite(observed.getTime())) reason = `${rule.column} is not a valid date`;
        else if (referenceTime.getTime() - observed.getTime() > maximumAgeMs) {
          reason = `${rule.column} is older than ${maximumAgeMs}ms`;
        }
      }
    }

    if (reason) {
      failedRows += 1;
      if (examples.length < 10) examples.push(failure(rowIndex, value, reason));
    }
  });

  const failureRatio = rows.length === 0 ? 0 : failedRows / rows.length;
  return {
    ruleId: rule.id,
    passed: failureRatio <= rule.maximumFailureRatio,
    checkedRows: rows.length,
    failedRows,
    failureRatio,
    examples,
  };
};
