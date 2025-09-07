// src/core/utils/number.ts

/**
 * Defensive programming helpers for numeric pipelines.
 * Keep this module dependency-free and domain-agnostic.
 */

/** Returns finite numbers; otherwise 0. */
export function sanitizeValue(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Coerces to a finite number; NaN/±Infinity -> fallback (default 0). */
export function toFinite(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Clamp to [min, max]. */
export function clamp(x: number, min: number, max: number): number {
  if (min > max) [min, max] = [max, min];
  const v = sanitizeValue(x);
  return v < min ? min : v > max ? max : v;
}

/** Safe divide: returns 0 if denominator is 0/NaN/±Inf. */
export function safeDivide(num: number, den: number): number {
  const d = sanitizeValue(den);
  if (d === 0) return 0;
  return sanitizeValue(num) / d;
}

/** Map over arrays defensively. */
export function sanitizeSeries(arr: number[]): number[] {
  return arr.map(sanitizeValue);
}
