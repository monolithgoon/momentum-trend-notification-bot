/**
 * Normalizes a metric to allow cross-ticker comparison while preserving
 * direction and relative magnitude.
 *
 * This implementation uses z-score normalization within the provided history.
 * You could swap for min-max normalization if you prefer 0-1 scaling.
 *
 * @param value - Raw value to normalize
 * @param field - Field name (used for extracting series from history)
 * @param history - Chronological array of snapshots
 * @returns normalized value (z-score)
 */
export function normalizeSeriesValue<T extends Record<string, any>>(
  value: number,
  field: keyof T,
  history: T[]
): number {
  if (history.length === 0) return 0;

  const series = history.map(s => Number(s[field]));
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  const variance = series.reduce((a, b) => a + (b - mean) ** 2, 0) / series.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  return (value - mean) / stdDev;
}
