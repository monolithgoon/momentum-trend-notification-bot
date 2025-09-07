/* ============================================================================
 * KineticsFields.ts
 * ----------------------------------------------------------------------------
 * Derived velocity/acceleration fields produced by the Kinetics stage.
 * These are appended to the base pipeline snapshot (compute input).
 * ========================================================================== */

export type KineticsFields = {
  /** Price % change velocity across selected lookback horizon(s) */
  readonly pct_change_velocity__ld_tick: number;

  /** Price % change acceleration across horizon(s) */
  readonly pct_change_acceleration__ld_tick: number;

  /** Volume velocity across horizon(s) */
  readonly volume_velocity__ld_tick: number;

  /** Volume acceleration across horizon(s) */
  readonly volume_acceleration__ld_tick: number;
};
