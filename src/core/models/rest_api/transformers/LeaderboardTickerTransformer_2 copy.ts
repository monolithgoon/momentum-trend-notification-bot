import { ILeaderboardTickerSnapshot_2 } from "../ILeaderboardTickerSnapshot.interface copy";
import { NormalizedRestTickerSnapshot } from "../NormalizedRestTickerSnapshot.interface";
import { NormalizedRestTickerSnapshotTransformer } from "./types/NormalizedRestTickerSnapshotTransformer.interface";

type Rankings = {
  volume_rank: number;
  vol_vel_rank: number;
  vol_acc_rank: number;
  pct_change_rank: number;
  pct_change_vel_rank: number;
  pct_change_acc_rank: number;
};

export class LeaderboardTickerTransformer_3
  implements NormalizedRestTickerSnapshotTransformer<ILeaderboardTickerSnapshot_2>
{
  transform(snapshot: NormalizedRestTickerSnapshot): ILeaderboardTickerSnapshot_2 {
    const rankings = {
      volume_rank: -1,
      vol_vel_rank: -1,
      vol_acc_rank: -1,
      pct_change_rank: -1,
      pct_change_vel_rank: -1,
      pct_change_acc_rank: -1,
    } satisfies Rankings;

    const out = {
      ticker_symbol__ld_tick: snapshot.ticker_symbol__nz_tick ? snapshot.ticker_symbol__nz_tick : snapshot.ticker_name__nz_tick, // keep your existing normalization
      ticker_name__ld_tick: snapshot.ticker_name__nz_tick,
      pct_change__ld_tick: snapshot.change_pct__nz_tick,
      timestamp__ld_tick: snapshot.timestamp__nz_tick,
      volume__ld_tick: snapshot.volume__nz_tick,

      // kinetics
      pct_change_velocity__ld_tick: 0,
      pct_change_acceleration__ld_tick: 0,
      volume_velocity__ld_tick: 0,
      volume_acceleration__ld_tick: 0,

      // streaks (recommend 0 over -1)
      num_consecutive_appearances: 0,
      num_consecutive_absences: 0,

      // ranks & final
      rankings,
      aggregate_kinetics_rank: 0,
      leaderboard_momentum_score: 0,
      leaderboard_rank: 0,

      // transient flag (will be flipped off in merge if seen before)
      first_time_seen_flag: true,
    } satisfies ILeaderboardTickerSnapshot_2;

    return out;
  }
}
