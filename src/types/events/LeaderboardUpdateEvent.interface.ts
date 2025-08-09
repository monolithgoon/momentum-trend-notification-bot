import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/LeaderboardRestTickerSnapshot.interface";

export interface LeaderboardUpdateEvent {
	leaderboardTag: string;
	total: number;
	topTicker?: string;
  preview?: LeaderboardRestTickerSnapshot[]
}
