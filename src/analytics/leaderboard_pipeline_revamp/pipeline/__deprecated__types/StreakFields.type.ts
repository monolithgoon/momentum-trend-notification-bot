/* ============================================================================
 * StreakFields.ts
 * ----------------------------------------------------------------------------
 * Streak / appearance tracking fields, typically added after the Kinetics
 * stage once you can correlate with historical leaderboard state.
 * ========================================================================== */

export type StreakFields = {
  /** Number of consecutive scans in which the ticker appears */
  readonly num_consecutive_appearances: number;

  /** Number of consecutive scans in which the ticker is absent */
  readonly num_consecutive_absences: number;

  /** True when the symbol is first observed in the leaderboard window */
  readonly first_time_seen_flag: boolean;
};
