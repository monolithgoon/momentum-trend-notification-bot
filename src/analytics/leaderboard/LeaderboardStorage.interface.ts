import { LeaderboardRestTickerSnapshot } from "@data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";
import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";

export interface LeaderboardStorage {
	storeSnapshot(ticker: string, snapshot: NormalizedRestTickerSnapshot): Promise<void>;
	retrieveAllSnapshotsForTicker(ticker: string): Promise<NormalizedRestTickerSnapshot[]>;
	retrieveRecentSnapshots(ticker: string, limit: number): Promise<NormalizedRestTickerSnapshot[]>;
	hasMinimumSnapshots(ticker: string, min: number): Promise<boolean>;
	setLeaderboard(leaderboard: LeaderboardRestTickerSnapshot[]): Promise<void>;
	getCurrentLeaderboard(): Promise<LeaderboardRestTickerSnapshot[] | null>;
}
