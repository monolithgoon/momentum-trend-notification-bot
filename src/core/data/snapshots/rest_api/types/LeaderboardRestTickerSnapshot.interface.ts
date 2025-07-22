export interface LeaderboardRestTickerSnapshot {
	change_pct: number | undefined;
	ld_ticker_name: string;
	perc_change_velocity: number;
	perc_change_acceleration: number;
	leaderboard_momentum_score: number;
	leaderboard_rank: number;
	timestamp: number;
	num_consecutive_appearances?: number; // Optional, will be set during merge
}
