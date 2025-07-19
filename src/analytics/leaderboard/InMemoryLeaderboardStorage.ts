import { LeaderboardRestTickerSnapshot } from "@data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";
import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { LeaderboardStorage } from "./LeaderboardStorage.interface";

export class InMemoryLeaderboardStorage implements LeaderboardStorage {
	private snapshots: Record<string, NormalizedRestTickerSnapshot[]> = {};
	private currentLeaderboard: LeaderboardRestTickerSnapshot[] = [];

	// TODO → Move to APP_CONFIG
	private readonly MIN_SNAPSHOT_COUNT = 2;

	async storeSnapshot(ticker: string, snapshot: NormalizedRestTickerSnapshot): Promise<void> {
		if (!this.snapshots[ticker]) {
			this.snapshots[ticker] = [];
		}
		this.snapshots[ticker].unshift(snapshot);
		if (this.snapshots[ticker].length > 5) {
			this.snapshots[ticker].pop(); // Keep latest 5 snapshots
		}
	}

	async retrieveAllSnapshotsForTicker(ticker: string): Promise<NormalizedRestTickerSnapshot[]> {
		return this.snapshots[ticker] ?? [];
	}

	async retrieveRecentSnapshots(ticker: string, limit: number): Promise<NormalizedRestTickerSnapshot[]> {
		const all = await this.retrieveAllSnapshotsForTicker(ticker);
		return all.slice(-limit);
	}

	async getCurrentLeaderboard(): Promise<LeaderboardRestTickerSnapshot[] | null> {
		return this.currentLeaderboard;
	}

	async hasMinimumSnapshots(ticker: string, min: number): Promise<boolean> {
		return (this.snapshots[ticker]?.length ?? 0) >= min;
	}

	async setLeaderboard(snapshots: LeaderboardRestTickerSnapshot[]): Promise<void> {
		this.currentLeaderboard = [...snapshots];
	}
}
