/* ============================================================================
   CORE CONTEXTUAL COMMENT — utils.ts
   ----------------------------------
   Small stat helpers. Keep pure and dependency-free.
============================================================================ */

import { IScalarPoint } from "./types";

export function values(series: IScalarPoint[]): number[] {
  return series.map(p => p.v);
}

export function mean(vals: number[]): number {
  if (!vals.length) return 0;
  let s = 0;
  for (let i = 0; i < vals.length; i++) s += vals[i];
  return s / vals.length;
}

export function variance(vals: number[], mu: number): number {
  if (!vals.length) return 0;
  let s = 0;
  for (let i = 0; i < vals.length; i++) {
    const d = vals[i] - mu;
    s += d * d;
  }
  return s / vals.length;
}

export function stdDev(vals: number[], mu?: number): number {
  const m = mu ?? mean(vals);
  return Math.sqrt(variance(vals, m));
}

export function minmax(vals: number[]): { min: number; max: number } {
  if (!vals.length) return { min: 0, max: 0 };
  let min = vals[0], max = vals[0];
  for (let i = 1; i < vals.length; i++) {
    const x = vals[i];
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return { min, max };
}

export function median(vals: number[]): number {
  if (!vals.length) return 0;
  const arr = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

export function mad(vals: number[], med?: number): number {
  if (!vals.length) return 0;
  const m = med ?? median(vals);
  const deviations = vals.map(x => Math.abs(x - m)).sort((a, b) => a - b);
  const mid = Math.floor(deviations.length / 2);
  return deviations.length % 2
    ? deviations[mid]
    : (deviations[mid - 1] + deviations[mid]) / 2;
}

/** Precompute helpers (opt-in) */
export function precomputeBasic(series: IScalarPoint[]) {
  const vals = values(series);
  const mu = mean(vals);
  const sd = stdDev(vals, mu);
  const { min, max } = minmax(vals);
  return { mean: mu, stdDev: sd, min, max };
}

export function precomputeRobust(series: IScalarPoint[]) {
  const vals = values(series);
  const med = median(vals);
  const m = mad(vals, med); // unscaled MAD
  return { median: med, mad: m };
}

export function precomputeSorted(series: IScalarPoint[]) {
  const sortedValsAsc = values(series).sort((a, b) => a - b);
  return { sortedValsAsc };
}

/** Binary search: index of last value <= x in sorted ascending array. */
export function upperBound(sortedAsc: number[], x: number): number {
  let lo = 0, hi = sortedAsc.length; // [lo, hi)
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedAsc[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1; // may be -1 if all > x
}
