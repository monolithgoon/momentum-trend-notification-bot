/**
 * CORE CONTEXTUAL COMMENT — math.ts
 * ---------------------------------
 * Mathematical helpers for Kinetics calculations.
 * Currently includes Ordinary Least Squares slope computation.
 */
export function calcOlsSlope(points: { t: number; v: number }[]): number {
  if (points.length < 2) return 0;
  const n = points.length;
  const meanT = points.reduce((sum, p) => sum + p.t, 0) / n;
  const meanV = points.reduce((sum, p) => sum + p.v, 0) / n;
  const numerator = points.reduce((sum, p) => sum + (p.t - meanT) * (p.v - meanV), 0);
  const denominator = points.reduce((sum, p) => sum + Math.pow(p.t - meanT, 2), 0);
  return denominator !== 0 ? numerator / denominator : 0;
}
