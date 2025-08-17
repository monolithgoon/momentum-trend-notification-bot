import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";

export interface ILeaderboardStorage {
	initializeLeaderboardStore(leaderboardName: string): Promise<void>; // pass the scan_strategy_tag here
	storeSnapshot(leaderboardName: string, ticker: string, snapshot: Partial<ILeaderboardTickerSnapshot_2>): Promise<void>;
	retrieveAllSnapshotsForTicker(leaderboardName: string, ticker: string): Promise<ILeaderboardTickerSnapshot_2[]>;
	readSnapshotHistoryForTicker(leaderboardName: string, ticker: string, limit: number): Promise<ILeaderboardTickerSnapshot_2[]>;
	hasMinimumSnapshots(leaderboardName: string, ticker: string, min: number): Promise<boolean>;
	persistLeaderboard(leaderboardName: string, leaderboard: ILeaderboardTickerSnapshot_2[]): Promise<void>;
	retrieveLeaderboard(leaderboardName: string): Promise<ILeaderboardTickerSnapshot_2[] | null>;
}

/** Result summary for batch snapshot writes */
export type BulkUpsertReport = { success: number; failed: Array<{ key: string; error: unknown }> };