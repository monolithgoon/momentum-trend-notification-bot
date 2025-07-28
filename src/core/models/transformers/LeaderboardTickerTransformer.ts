import { NormalizedRestTickerSnapshotTransformer } from "./types/NormalizedRestTickerSnapshotTransformer.interface";
import { LeaderboardRestTickerSnapshot } from "../LeaderboardRestTickerSnapshot.interface";
import { NormalizedRestTickerSnapshot } from "../NormalizedRestTickerSnapshot.interface";

export class LeaderboardTickerTransformer implements NormalizedRestTickerSnapshotTransformer<LeaderboardRestTickerSnapshot> {

	transform(snapshot: NormalizedRestTickerSnapshot): LeaderboardRestTickerSnapshot {
		return {
			...snapshot,
			ticker_name__ld_tick: snapshot.ticker_name__nz_tick,
			change_pct__ld_tick: snapshot.change_pct__nz_tick,
			timestamp__ld_tick: snapshot.timestamp,
			volume__ld_tick: snapshot.volume ?? 0,
			pct_change_velocity__ld_tick: 0,
			pct_change_acceleration__ld_tick: 0,
			volume_velocity__ld_tick: 0,
			volume_acceleration__ld_tick: 0,
			ordinal_sort_position: snapshot.ordinal_sort_position,
			leaderboard_momentum_score: 0, // Placeholder, will be computed later
			leaderboard_rank: 0,
			num_consecutive_appearances: 1, // Default to 1, will be updated during merge
		};
	}
}