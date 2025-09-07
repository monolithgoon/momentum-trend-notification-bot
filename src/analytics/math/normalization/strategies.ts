/* ============================================================================
   CORE CONTEXTUAL COMMENT — strategies.ts
   ---------------------------------------
   Built-in normalization strategies. Each strategy is a pure function that
   maps (value, series, opts) -> normalized scalar.
   Added extras: ROBUST_Z (median/MAD), RANK (0..1 by rank).
============================================================================ */

/* Built-in normalization strategies. Pure functions only. */

import { NormalizationFn } from "./types";
import { values, mean, stdDev, minmax, median, mad, upperBound } from "./utils";

/** Namespaced, dot-access keys (no enums). */
export const NormalizationRegistry = {
  NONE: "NONE",
  Z_SCORE: "Z_SCORE",
  MIN_MAX: "MIN_MAX",
  ROBUST_Z: "ROBUST_Z",
  RANK: "RANK",
} as const;

export type TNormalizationKey = typeof NormalizationRegistry[keyof typeof NormalizationRegistry];

/* --- strategy impls --- */
const none: NormalizationFn = (v) => v;
const zScore: NormalizationFn = (v, series, opts) => {
  if (!series.length) return 0;
  const vals = values(series);
  const mu = opts?.mean ?? mean(vals);
  const sd = opts?.stdDev ?? stdDev(vals, mu);
  return sd > 0 ? (v - mu) / sd : 0;
};
const minMax: NormalizationFn = (v, series, opts) => {
  if (!series.length) return 0;
  const vals = values(series);
  const { min, max } = { min: opts?.min ?? minmax(vals).min, max: opts?.max ?? minmax(vals).max };
  return max > min ? (v - min) / (max - min) : 0;
};
const robustZ: NormalizationFn = (v, series, opts) => {
  if (!series.length) return 0;
  const vals = values(series);
  const med = opts?.median ?? median(vals);
  const m = opts?.mad ?? mad(vals, med);
  const scale = m * 1.4826;
  return scale > 0 ? (v - med) / scale : 0;
};
const rankScale: NormalizationFn = (v, series, opts) => {
  const n = series.length;
  if (!n) return 0;
  const direction = opts?.direction ?? "asc";
  const sorted = opts?.sortedValsAsc ? opts.sortedValsAsc : values(series).sort((a, b) => a - b);
  // index of last <= v
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] <= v) lo = mid + 1; else hi = mid;
  }
  const posAsc = Math.max(0, lo);                  // 0..n
  const fracAsc = n > 1 ? posAsc / (n - 1) : 1;    // avoid div-by-0
  return direction === "asc" ? fracAsc : 1 - fracAsc;
};

/** Single source of truth registry (keyed by constants above). */
export const BUILTIN_NORMALIZATION_FNS: Record<TNormalizationKey, NormalizationFn> = {
  [NormalizationRegistry.NONE]: none,
  [NormalizationRegistry.Z_SCORE]: zScore,
  [NormalizationRegistry.MIN_MAX]: minMax,
  [NormalizationRegistry.ROBUST_Z]: robustZ,
  [NormalizationRegistry.RANK]: rankScale,
} as const;