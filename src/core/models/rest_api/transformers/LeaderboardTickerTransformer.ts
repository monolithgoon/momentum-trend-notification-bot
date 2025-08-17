import { LeaderboardRestTickerSnapshot } from "../LeaderboardRestTickerSnapshot.interface";
import { NormalizedRestTickerSnapshot } from "../NormalizedRestTickerSnapshot.interface";
import { NormalizedRestTickerSnapshotTransformer } from "./types/NormalizedRestTickerSnapshotTransformer.interface";

export class LeaderboardTickerTransformer implements NormalizedRestTickerSnapshotTransformer<LeaderboardRestTickerSnapshot> {

	transform(snapshot: NormalizedRestTickerSnapshot): LeaderboardRestTickerSnapshot {
		return {
			...snapshot,
			ticker_symbol__ld_tick: snapshot.ticker_symbol__nz_tick,
			ticker_name__ld_tick: snapshot.ticker_name__nz_tick,
			pct_change__ld_tick: snapshot.change_pct__nz_tick,
			timestamp__ld_tick: snapshot.timestamp__nz_tick,
			volume__ld_tick: snapshot.volume__nz_tick,
			pct_change_velocity__ld_tick: 0,
			pct_change_acceleration__ld_tick: 0,
			volume_velocity__ld_tick: 0,
			volume_acceleration__ld_tick: 0,
			leaderboard_momentum_score: 0, // Placeholder, will be computed later
			leaderboard_rank: -1,
			num_consecutive_appearances: -1, // Default to -1, will be updated during merge
			num_consecutive_absences: -1, // Default to -1, will be updated during merge
		};
	}
}