import { LeaderboardRestTickerSnapshot } from "@data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";
import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";

export interface LeaderboardStorage {
	createLeaderboard(leaderboardName: string): void; // pass the scan_strategy_tag here
	storeSnapshot(leaderboardName: string, ticker: string, snapshot: NormalizedRestTickerSnapshot): Promise<void>;
	retrieveAllSnapshotsForTicker(leaderboardName: string, ticker: string): Promise<NormalizedRestTickerSnapshot[]>;
	retrieveRecentSnapshots(leaderboardName: string, ticker: string, limit: number): Promise<NormalizedRestTickerSnapshot[]>;
	hasMinimumSnapshots(leaderboardName: string, ticker: string, min: number): Promise<boolean>;
	setLeaderboard(leaderboardName: string, leaderboard: LeaderboardRestTickerSnapshot[]): Promise<void>;
	getCurrentLeaderboard(leaderboardName: string): Promise<LeaderboardRestTickerSnapshot[] | null>;
}
