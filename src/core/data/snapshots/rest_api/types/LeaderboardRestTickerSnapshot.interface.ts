export interface LeaderboardRestTickerSnapshot {
	ld_ticker_name: string;
	ld_change_pct: number | 0;
	ld_timestamp: number;
	ld_volume: number;
	// 2nd order derivative computed fields
	ld_pct_change_velocity: number;
	ld_pct_change_acceleration: number;
	ld_volume_velocity: number;
	ld_volume_acceleration: number;
	// Rank & sort fields
	ld_ordinal_sort_position: number;
	leaderboard_momentum_score: number;
	leaderboard_rank: number;
	// Other
	num_consecutive_appearances: number; // Optional, will be set during merge
}
