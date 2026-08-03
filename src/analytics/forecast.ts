export interface ForecastMetrics {
  mae: number;
  rmse: number;
  mape: number | null;
}

const validateSeries = (label: string, values: number[]): void => {
  if (values.length === 0) throw new Error(`${label} must contain at least one value`);
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error(`${label} must contain only finite numbers`);
  }
};

export const forecastMetrics = (actual: number[], predicted: number[]): ForecastMetrics => {
  validateSeries("Actual series", actual);
  validateSeries("Predicted series", predicted);
  if (actual.length !== predicted.length) throw new Error("Actual and predicted series must have equal length");

  const absoluteErrors = actual.map((value, index) => Math.abs(value - (predicted[index] ?? 0)));
  const squaredErrors = actual.map((value, index) => {
    const error = value - (predicted[index] ?? 0);
    return error * error;
  });
  const percentageErrors = actual.flatMap((value, index) =>
    value === 0 ? [] : [Math.abs((value - (predicted[index] ?? 0)) / value)]);

  return {
    mae: absoluteErrors.reduce((sum, value) => sum + value, 0) / actual.length,
    rmse: Math.sqrt(squaredErrors.reduce((sum, value) => sum + value, 0) / actual.length),
    mape: percentageErrors.length === 0
      ? null
      : percentageErrors.reduce((sum, value) => sum + value, 0) / percentageErrors.length,
  };
};

export const evaluateAgainstConstantBaseline = (
  actual: number[],
  predicted: number[],
  baselineValue: number,
): { model: ForecastMetrics; baseline: ForecastMetrics; beatsBaseline: boolean } => {
  if (!Number.isFinite(baselineValue)) throw new Error("Baseline value must be finite");
  const model = forecastMetrics(actual, predicted);
  const baseline = forecastMetrics(actual, actual.map(() => baselineValue));
  return {
    model,
    baseline,
    beatsBaseline: model.rmse < baseline.rmse,
  };
};
