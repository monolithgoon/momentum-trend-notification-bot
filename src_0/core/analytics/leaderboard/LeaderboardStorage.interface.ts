import { LeaderboardRestTickerSnapshot } from "@core/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";

export interface LeaderboardStorage {
	initializeLeaderboardStore(leaderboardName: string): Promise<void>; // pass the scan_strategy_tag here
	storeSnapshot(leaderboardName: string, ticker: string, snapshot: LeaderboardRestTickerSnapshot): Promise<void>;
	retrieveAllSnapshotsForTicker(leaderboardName: string, ticker: string): Promise<LeaderboardRestTickerSnapshot[]>;
	retrieveRecentSnapshots(leaderboardName: string, ticker: string, limit: number): Promise<LeaderboardRestTickerSnapshot[]>;
	hasMinimumSnapshots(leaderboardName: string, ticker: string, min: number): Promise<boolean>;
	persistLeaderboard(leaderboardName: string, leaderboard: LeaderboardRestTickerSnapshot[]): Promise<void>;
	retrieveLeaderboard(leaderboardName: string): Promise<LeaderboardRestTickerSnapshot[] | null>;
}
