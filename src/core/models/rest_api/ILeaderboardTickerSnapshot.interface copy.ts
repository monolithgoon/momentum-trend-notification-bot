import { BaseInternalTickerSnapshot } from "./BaseInternalTickerSnapshot.interface";

export interface ILeaderboardTickerSnapshot_2 extends BaseInternalTickerSnapshot {
  // Identity (immutable)
  readonly ticker_symbol__ld_tick: string;
  readonly ticker_name__ld_tick: string;
  readonly timestamp__ld_tick: number;

  // Inputs
  readonly change_pct__ld_tick: number;
  readonly volume__ld_tick: number;

  // Kinetics (derived, mutable during enrich)
  pct_change_velocity__ld_tick: number;
  pct_change_acceleration__ld_tick: number;
  volume_velocity__ld_tick: number;
  volume_acceleration__ld_tick: number;

  // Streaks (maintained during merge)
  num_consecutive_appearances: number; // default 0
  num_consecutive_absences: number;    // default 0

  // Rankings (dense ranks; smaller is better)
  rankings: {
    // recency_rank: number;           // 0=new this scan, 1=present carryover, >1=decayed on absence
    volume_rank: number;
    vol_vel_rank: number;
    vol_acc_rank: number;
    pct_change_rank: number;
    pct_change_vel_rank: number;
    pct_change_acc_rank: number;
  };

  // Aggregate / final
  aggregate_kinetics_rank: number;  // sum or weighted sum of selected ranking keys
  leaderboard_momentum_score: number; // if kept, document usage vs aggregate
  leaderboard_rank: number;         // final sorted position (assigned post-sort)

  // Transient flags (optional to persist; if persisted, define reset semantics)
  first_time_seen_flag: boolean;    // default false; set true on first appearance only
}
