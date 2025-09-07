/* ============================================================================
   CORE CONTEXTUAL COMMENT — types.ts
   ----------------------------------
   Minimal types used across normalization modules to avoid coupling.
============================================================================ */

export interface IScalarPoint { v: number }

export type Direction = "asc" | "desc";

/** Optional precomputed stats to avoid O(n) recomputation per call. */
export interface PrecomputedStats {
  // basic
  mean?: number;
  stdDev?: number;
  min?: number;
  max?: number;

  // robust
  median?: number;
  mad?: number; // Median Absolute Deviation (unscaled)

  // ranking helpers
  sortedValsAsc?: number[]; // for binary search
}

export type NormalizationFn = (
  value: number,
  series: IScalarPoint[],
  opts?: PrecomputedStats & { direction?: Direction }
) => number;
