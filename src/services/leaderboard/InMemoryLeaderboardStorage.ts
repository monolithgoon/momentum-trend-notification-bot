import { LeaderboardStorage } from "./LeaderboardStorage.interface";
import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/LeaderboardRestTickerSnapshot.interface";

// export class InMemoryLeaderboardStorage_0 implements LeaderboardStorage {
// 	private data: Record<string, LeaderboardRestTickerSnapshot[]> = {};
// 	private currentLeaderboard: LeaderboardRestTickerSnapshot[] = [];

// 	// TODO → Move to APP_CONFIG
// 	private readonly MIN_SNAPSHOT_HISTORY_COUNT = 2;

// 	async storeSnapshot(ticker: string, snapshot: LeaderboardRestTickerSnapshot): Promise<void> {
// 		if (!this.data[ticker]) {
// 			this.data[ticker] = [];
// 		}
// 		this.data[ticker].unshift(snapshot);
// 		if (this.data[ticker].length > 5) {
// 			this.data[ticker].pop(); // Keep latest 5 data
// 		}
// 	}

// 	async retrieveAllSnapshotsForTicker(ticker: string): Promise<LeaderboardRestTickerSnapshot[]> {
// 		return this.data[ticker] ?? [];
// 	}

// 	async readSnapshotHistoryForTicker(ticker: string, limit: number): Promise<LeaderboardRestTickerSnapshot[]> {
// 		const all = await this.retrieveAllSnapshotsForTicker(ticker);
// 		return all.slice(-limit);
// 	}

// 	async retreiveLeaderboard(): Promise<LeaderboardRestTickerSnapshot[] | null> {
// 		return this.currentLeaderboard;
// 	}

// 	async hasMinimumSnapshots(ticker: string, min: number): Promise<boolean> {
// 		return (this.data[ticker]?.length ?? 0) >= min;
// 	}

// 	async persistLeaderboard(data: LeaderboardRestTickerSnapshot[]): Promise<void> {
// 		this.currentLeaderboard = [...data];
// 	}
// }

export class InMemoryLeaderboardStorage implements LeaderboardStorage {
	private data: Record<string, Record<string, LeaderboardRestTickerSnapshot[]>> = {};
	private currentLeaderboards: Record<string, LeaderboardRestTickerSnapshot[]> = {};

	private readonly MIN_SNAPSHOT_HISTORY_COUNT = 2;

	async initializeLeaderboardStore(leaderboardName: string): Promise<void> {
		if (!this.data[leaderboardName]) {
			this.data[leaderboardName] = {};
		}
		if (!this.currentLeaderboards[leaderboardName]) {
			this.currentLeaderboards[leaderboardName] = [];
		}
	}

	async storeSnapshot(leaderboardName: string, ticker: string, snapshot: LeaderboardRestTickerSnapshot): Promise<void> {
		this.initializeLeaderboardStore(leaderboardName);
		if (!this.data[leaderboardName][ticker]) {
			this.data[leaderboardName][ticker] = [];
		}
		this.data[leaderboardName][ticker].unshift(snapshot);
		if (this.data[leaderboardName][ticker].length > 5) {
			this.data[leaderboardName][ticker].pop(); // Keep latest 5 data
		}
	}

	async retrieveAllSnapshotsForTicker(leaderboardName: string, ticker: string): Promise<LeaderboardRestTickerSnapshot[]> {
		this.initializeLeaderboardStore(leaderboardName);
		return this.data[leaderboardName][ticker] ?? [];
	}

	async readSnapshotHistoryForTicker(leaderboardName: string, ticker: string, limit: number): Promise<LeaderboardRestTickerSnapshot[]> {
		const all = await this.retrieveAllSnapshotsForTicker(leaderboardName, ticker);
		return all.slice(-limit);
	}

	async retreiveLeaderboard(leaderboardName: string): Promise<LeaderboardRestTickerSnapshot[] | null> {
		this.initializeLeaderboardStore(leaderboardName);
		return this.currentLeaderboards[leaderboardName];
	}

	async hasMinimumSnapshots(leaderboardName: string, ticker: string, min: number): Promise<boolean> {
		this.initializeLeaderboardStore(leaderboardName);
		return (this.data[leaderboardName][ticker]?.length ?? 0) >= min;
	}

	async persistLeaderboard(leaderboardName: string, data: LeaderboardRestTickerSnapshot[]): Promise<void> {
		this.initializeLeaderboardStore(leaderboardName);
		this.currentLeaderboards[leaderboardName] = [...data];
	}
}
