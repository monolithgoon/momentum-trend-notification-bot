import { ILeaderboardTickerSnapshot } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface";

export interface ILeaderboardStorage {
	initializeLeaderboardStore(leaderboardName: string): Promise<void>; // pass the scan_strategy_tag here
	storeSnapshot(leaderboardName: string, ticker: string, snapshot: ILeaderboardTickerSnapshot): Promise<void>;
	retrieveAllSnapshotsForTicker(leaderboardName: string, ticker: string): Promise<ILeaderboardTickerSnapshot[]>;
	readSnapshotHistoryForTicker(leaderboardName: string, ticker: string, limit: number): Promise<ILeaderboardTickerSnapshot[]>;
	hasMinimumSnapshots(leaderboardName: string, ticker: string, min: number): Promise<boolean>;
	persistLeaderboard(leaderboardName: string, leaderboard: ILeaderboardTickerSnapshot[]): Promise<void>;
	retrieveLeaderboard(leaderboardName: string): Promise<ILeaderboardTickerSnapshot[] | null>;
}
