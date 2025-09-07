/* ============================================================================
 * RankingFields.ts
 * ----------------------------------------------------------------------------
 * Ranks and aggregate leaderboard scores produced by the Ranking stage.
 * Keep rank fields numeric and dense-ranked unless otherwise documented.
 * ========================================================================== */

export type PerMetricRankings = {
  /** Rank by absolute/normalized volume */
  readonly volume_rank: number;

  /** Rank by volume velocity */
  readonly vol_vel_rank: number;

  /** Rank by volume acceleration */
  readonly vol_acc_rank: number;

  /** Rank by price % change */
  readonly pct_change_rank: number;

  /** Rank by price % change velocity */
  readonly pct_change_vel_rank: number;

  /** Rank by price % change acceleration */
  readonly pct_change_acc_rank: number;
};

export type AggregateLeaderboardScores = {
  /** Aggregate rank from kinetics-focused scoring (lower is better if ASC) */
  readonly aggregate_kinetics_rank: number;

  /** Composite momentum score used for leaderboard ordering */
  readonly leaderboard_momentum_score: number;

  /** Final displayed leaderboard rank (after tiebreaks / sort) */
  readonly leaderboard_rank: number;
};

export type RankingFields = {
  readonly rankings: PerMetricRankings;
} & AggregateLeaderboardScores;
