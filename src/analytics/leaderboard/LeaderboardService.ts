import { LeaderboardRestTickerSnapshot } from "@data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";
import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { LeaderboardStorage } from "./LeaderboardStorage.interface";
import { KineticsCalculators } from "./LeaderboardKineticsCalculator";
import { RankedRestTickerSnapshot } from "@data/snapshots/rest_api/types/RankedRestTickerSnapshot.interface";

// // Simple in-memory store for previous snapshots (could be replaced with Redis later)
// const snapshotHistory: Record<string, NormalizedRestTickerSnapshot[]> = {};

// // Append to history and return past snapshots
// function updateHistory(ticker: string, snapshot: NormalizedRestTickerSnapshot) {
// 	if (!snapshotHistory[ticker]) {
// 		snapshotHistory[ticker] = [];
// 	}

// 	snapshotHistory[ticker].push(snapshot);

// 	// Limit history size
// 	if (snapshotHistory[ticker].length > 5) {
// 		snapshotHistory[ticker].shift(); // remove oldest
// 	}

// 	return snapshotHistory[ticker];
// }

// export function computeVelocity(snapshot: NormalizedRestTickerSnapshot): number {
// 	const history = updateHistory(snapshot.ticker, snapshot);
// 	if (history.length < 2) return 0;

// 	const prev = history[history.length - 2];
// 	const deltaPct = snapshot.change_pct - prev.change_pct;
// 	const deltaTime = (snapshot.timestamp - prev.timestamp) / 1000; // seconds

// 	return deltaTime > 0 ? deltaPct / deltaTime : 0;
// }

// export function computeAcceleration(snapshot: NormalizedRestTickerSnapshot): number {
// 	const history = snapshotHistory[snapshot.ticker];
// 	if (!history || history.length < 3) return 0;

// 	const s1 = history[history.length - 3];
// 	const s2 = history[history.length - 2];
// 	const s3 = history[history.length - 1];

// 	const v1 = (s2.change_pct - s1.change_pct) / ((s2.timestamp - s1.timestamp) / 1000);
// 	const v2 = (s3.change_pct - s2.change_pct) / ((s3.timestamp - s2.timestamp) / 1000);

// 	const deltaTime = (s3.timestamp - s2.timestamp) / 1000;

// 	return deltaTime > 0 ? (v2 - v1) / deltaTime : 0;
// }

export interface SnapshotSorter {
	sort(snapshots: LeaderboardRestTickerSnapshot[]): LeaderboardRestTickerSnapshot[];
}

// TODO - remove the hard-coding
type SortableField = keyof Pick<LeaderboardRestTickerSnapshot, "score" | "velocity" | "acceleration">;
type SortOrder = "asc" | "desc";

export class LeaderboardSnapshotSorter implements SnapshotSorter {
  constructor(
    private readonly sortField: SortableField = "score",
    private readonly sortOrder: SortOrder = "desc"
  ) {}

  sort(snapshots: LeaderboardRestTickerSnapshot[]): LeaderboardRestTickerSnapshot[] {
    const multiplier = this.sortOrder === "asc" ? 1 : -1;

    return snapshots
      .slice()
      .sort(
        (a, b) =>
          multiplier *
          (((a[this.sortField] ?? 0) as number) -
            ((b[this.sortField] ?? 0) as number))
      );
  }
}

export class LeaderboardService {
	constructor(
		private readonly storage: LeaderboardStorage,
		private readonly sorter: SnapshotSorter,
		private readonly kineticsCalculator: KineticsCalculators
	) {}

	async processSnapshots(snapshots: RankedRestTickerSnapshot[]): Promise<LeaderboardRestTickerSnapshot[]> {
		const leaderboard: LeaderboardRestTickerSnapshot[] = [];

		for (const snapshot of snapshots) {
			await this.storage.storeSnapshot(snapshot.ticker, snapshot);

			const history = await this.storage.retrieveAllSnapshotsForTicker(snapshot.ticker);
			if (history.length < 2) continue;

			const velocity = this.kineticsCalculator.computeVelocity(history.slice(0, 2));
			const acceleration = this.kineticsCalculator.computeAcceleration(history.slice(0, 3));

			leaderboard.push({
				ticker: snapshot.ticker,
				timestamp: snapshot.timestamp,
				velocity,
				acceleration,
				score: velocity + 0.5 * acceleration,
				leaderboard_rank: snapshot.sorted_scan_rank,
			});
		}

		const sorted = this.sorter.sort(leaderboard);
		sorted.forEach((snapshot, idx) => (snapshot.leaderboard_rank = idx + 1));

		await this.storage.setLeaderboard(sorted);
		return sorted;
	}

	async getCurrentLeaderboard(): Promise<LeaderboardRestTickerSnapshot[] | null> {
		return this.storage.getCurrentLeaderboard();
	}
}
