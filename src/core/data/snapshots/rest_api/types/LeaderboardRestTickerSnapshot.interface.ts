export interface LeaderboardRestTickerSnapshot {
	ticker: string;
	velocity: number;
	acceleration: number;
	score: number;
	leaderboard_rank: number;
	timestamp: number;
}
