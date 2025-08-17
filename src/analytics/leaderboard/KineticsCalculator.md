```ts
/**
 * SEMANTICS & POLICY — KineticsCalculator
 *
 * Purpose
 * -------
 * Provide finite-safe, windowed trend measures over a numeric time series taken
 * from leaderboard snapshots. Exposes:
 *   • computeVelocity(field): OLS slope over the most-recent velWindow bars
 *   • computeAcceleration(field): slope of first-differences (Δy) over accWindow bars
 *
 * Inputs
 * ------
 * • history: array of numeric-only views of snapshots (e.g., { timestamp__ld_tick, pct_change__ld_tick, volume__ld_tick })
 * • opts:
 *     - velWindow (bars): regression window for velocity
 *     - accWindow (bars): regression window for acceleration
 *     - fallback (number): value to return on degenerate inputs (NaN/∞/insufficient data)
 *     - sortByTimeAsc (boolean): if true, sorts history ascending by timestamp
 *
 * Output
 * ------
 * • Finite numbers for velocity/acceleration; never NaN/±Infinity by contract (fallback applied).
 *
 * Core Rules
 * ----------
 * 1) Time order
 *    - If enabled, data is sorted (ascending) to ensure consistent regression math.
 * 2) Windowing
 *    - Velocity uses the last velWindow points; acceleration uses the last accWindow Δy values.
 * 3) Finite-safety
 *    - Any non-finite intermediate (NaN/±Infinity) yields `fallback`.
 * 4) Strict numeric access
 *    - Only numeric fields are read; non-numeric properties are ignored by design.
 *
 * Rationale
 * ---------
 * - OLS slope in a trailing window reacts to recent behavior (short-term trend) without being
 *   diluted by distant history.
 * - Acceleration via slope(Δy) captures *change in velocity* cheaply (no nested regressions),
 *   suitable for ramp detection.
 * - Finite-safe guarantees keep downstream ranking/aggregation stable and serializable.
 *
 * Edge Cases & Guarantees
 * -----------------------
 * - Too few points for a window ⇒ returns fallback (typically 0).
 * - Constant series (zero variance) ⇒ denom=0 ⇒ fallback.
 * - Gaps/invalid values ⇒ fallback (prevents NaN propagation).
 *
 * Contract for Callers
 * --------------------
 * - Prepare numeric-only slices before constructing (e.g., { timestamp, change_pct, volume }).
 * - Choose windows to match bar timeframe (e.g., 20×1m bars ~ last 20 minutes).
 * - Use velocity guards outside if you want to suppress accel on near-flat drift.
 */
```