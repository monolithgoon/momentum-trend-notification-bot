export interface LeaderboardRestTickerSnapshot {
	ticker: string;
	velocity: number;
	acceleration: number;
	leaderboard_momentum_score: number;
	leaderboard_rank: number;
	timestamp: number;
	consecutiveAppearances?: number; // Optional, will be set during merge
}
