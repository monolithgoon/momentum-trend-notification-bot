/**
 * Computes the Ordinary Least Squares (OLS) slope of a numeric field
 * in a snapshot history over a given lookback window.
 *
 * @param history - Full array of ticker snapshots (chronologically ordered)
 * @param field - The key in each snapshot to run OLS on (e.g. "pct_change__ld_tick")
 * @param window - Number of most recent points to include in the regression
 * @returns slope (units per second)
 */
export function calcOlsSlope<T extends Record<string, any>>(
  history: T[],
  field: keyof T,
  window: number
): number {
  if (history.length < 2) return 0;

  const sliced = history.slice(-window);
  if (sliced.length < 2) return 0;

  // Prepare time/value arrays
  const times = sliced.map(s => (s.timestamp__ld_tick ?? s.timestamp ?? 0) / 1000); // seconds
  const values = sliced.map(s => Number(s[field]));

  // Means
  const meanT = times.reduce((a, b) => a + b, 0) / times.length;
  const meanV = values.reduce((a, b) => a + b, 0) / values.length;

  // Covariance / variance
  let num = 0;
  let den = 0;
  for (let i = 0; i < times.length; i++) {
    num += (times[i] - meanT) * (values[i] - meanV);
    den += (times[i] - meanT) ** 2;
  }

  return den === 0 ? 0 : num / den;
}
