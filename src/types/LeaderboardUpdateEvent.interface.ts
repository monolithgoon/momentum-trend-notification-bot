import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/LeaderboardRestTickerSnapshot.interface";

export interface LeaderboardUpdateEvent {
	tag: string;
	total: number;
	topTicker?: string;
  preview?: LeaderboardRestTickerSnapshot[]
}
