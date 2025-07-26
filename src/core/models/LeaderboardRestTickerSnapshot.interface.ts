export interface LeaderboardRestTickerSnapshot {
	ticker_name__ld_tick: string;
	change_pct__ld_tick: number | 0;
	timestamp__ld_tick: number;
	volume__ld_tick: number;
	// Kinetics metrics
	pct_change_velocity__ld_tick: number;
	pct_change_acceleration__ld_tick: number;
	volume_velocity__ld_tick: number;
	volume_acceleration__ld_tick: number;
	// Rank & sort fields
	ordinal_sort_position__ld_tick: number;
	leaderboard_momentum_score: number;
	leaderboard_rank: number;
	// Other
	num_consecutive_appearances: number; // Optional, will be set during merge
}
