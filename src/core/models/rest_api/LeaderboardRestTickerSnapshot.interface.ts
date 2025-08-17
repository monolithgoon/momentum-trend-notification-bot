import { BaseInternalTickerSnapshot } from "./BaseInternalTickerSnapshot.interface";

export interface LeaderboardRestTickerSnapshot extends BaseInternalTickerSnapshot {
	ticker_symbol__ld_tick: string;
	ticker_name__ld_tick: string;
	timestamp__ld_tick: number;
	pct_change__ld_tick: number;
	volume__ld_tick: number;
	// Kinetics metrics
	pct_change_velocity__ld_tick: number;
	pct_change_acceleration__ld_tick: number;
	volume_velocity__ld_tick: number;
	volume_acceleration__ld_tick: number;
	// Rank & sort fields
	leaderboard_momentum_score: number;
	leaderboard_rank: number;
	// Other
	num_consecutive_appearances: number; // Optional, will be set during merge
	num_consecutive_absences: number; // Optional, will be set during merge
}
