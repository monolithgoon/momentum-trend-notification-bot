/**
 * CORE CONTEXTUAL COMMENT — guards.ts
 * -----------------------------------
 * Defensive programming helpers for Kinetics.
 * Ensures that only safe numeric values are returned to consumers.
 */
export function sanitizeValue(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
