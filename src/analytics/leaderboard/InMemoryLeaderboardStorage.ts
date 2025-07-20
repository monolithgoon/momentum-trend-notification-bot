import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { LeaderboardRestTickerSnapshot } from "@data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";
import { LeaderboardStorage } from "./LeaderboardStorage.interface";

// export class InMemoryLeaderboardStorage_0 implements LeaderboardStorage {
// 	private data: Record<string, NormalizedRestTickerSnapshot[]> = {};
// 	private currentLeaderboard: LeaderboardRestTickerSnapshot[] = [];

// 	// TODO → Move to APP_CONFIG
// 	private readonly MIN_SNAPSHOT_HISTORY_COUNT = 2;

// 	async storeSnapshot(ticker: string, snapshot: NormalizedRestTickerSnapshot): Promise<void> {
// 		if (!this.data[ticker]) {
// 			this.data[ticker] = [];
// 		}
// 		this.data[ticker].unshift(snapshot);
// 		if (this.data[ticker].length > 5) {
// 			this.data[ticker].pop(); // Keep latest 5 data
// 		}
// 	}

// 	async retrieveAllSnapshotsForTicker(ticker: string): Promise<NormalizedRestTickerSnapshot[]> {
// 		return this.data[ticker] ?? [];
// 	}

// 	async retrieveRecentSnapshots(ticker: string, limit: number): Promise<NormalizedRestTickerSnapshot[]> {
// 		const all = await this.retrieveAllSnapshotsForTicker(ticker);
// 		return all.slice(-limit);
// 	}

// 	async getCurrentLeaderboard(): Promise<LeaderboardRestTickerSnapshot[] | null> {
// 		return this.currentLeaderboard;
// 	}

// 	async hasMinimumSnapshots(ticker: string, min: number): Promise<boolean> {
// 		return (this.data[ticker]?.length ?? 0) >= min;
// 	}

// 	async setLeaderboard(data: LeaderboardRestTickerSnapshot[]): Promise<void> {
// 		this.currentLeaderboard = [...data];
// 	}
// }

export class InMemoryLeaderboardStorage implements LeaderboardStorage {
	private data: Record<string, Record<string, NormalizedRestTickerSnapshot[]>> = {};
	private currentLeaderboards: Record<string, LeaderboardRestTickerSnapshot[]> = {};

	private readonly MIN_SNAPSHOT_HISTORY_COUNT = 2;

	createLeaderboard(leaderboardName: string): void {
		if (!this.data[leaderboardName]) {
			this.data[leaderboardName] = {};
		}
		if (!this.currentLeaderboards[leaderboardName]) {
			this.currentLeaderboards[leaderboardName] = [];
		}
	}

	async storeSnapshot(leaderboardName: string, ticker: string, snapshot: NormalizedRestTickerSnapshot): Promise<void> {
		this.createLeaderboard(leaderboardName);
		if (!this.data[leaderboardName][ticker]) {
			this.data[leaderboardName][ticker] = [];
		}
		this.data[leaderboardName][ticker].unshift(snapshot);
		if (this.data[leaderboardName][ticker].length > 5) {
			this.data[leaderboardName][ticker].pop(); // Keep latest 5 data
		}
	}

	async retrieveAllSnapshotsForTicker(leaderboardName: string, ticker: string): Promise<NormalizedRestTickerSnapshot[]> {
		this.createLeaderboard(leaderboardName);
		return this.data[leaderboardName][ticker] ?? [];
	}

	async retrieveRecentSnapshots(leaderboardName: string, ticker: string, limit: number): Promise<NormalizedRestTickerSnapshot[]> {
		const all = await this.retrieveAllSnapshotsForTicker(leaderboardName, ticker);
		return all.slice(-limit);
	}

	async getCurrentLeaderboard(leaderboardName: string): Promise<LeaderboardRestTickerSnapshot[] | null> {
		this.createLeaderboard(leaderboardName);
		return this.currentLeaderboards[leaderboardName];
	}

	async hasMinimumSnapshots(leaderboardName: string, ticker: string, min: number): Promise<boolean> {
		this.createLeaderboard(leaderboardName);
		return (this.data[leaderboardName][ticker]?.length ?? 0) >= min;
	}

	async setLeaderboard(leaderboardName: string, data: LeaderboardRestTickerSnapshot[]): Promise<void> {
		this.createLeaderboard(leaderboardName);
		this.currentLeaderboards[leaderboardName] = [...data];
	}
}
