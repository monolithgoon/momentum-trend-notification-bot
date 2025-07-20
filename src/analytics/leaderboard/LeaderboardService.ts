import { TaggedMarketScanTickers } from "@data/snapshots/rest_api/types/tagged-market-scan-tickers.interface";
import { LeaderboardRestTickerSnapshot } from "@data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";
import { LeaderboardStorage } from "./LeaderboardStorage.interface";
import { TickerSorter } from "@core/interfaces/tickerSorter.interface";
import { LeaderboardKineticsCalculator } from "./LeaderboardKineticsCalculator";
import { APP_CONFIG } from "@config/index";

export class LeaderboardService {
	constructor(private readonly storage: LeaderboardStorage) {}

	async processSnapshots(
		data: TaggedMarketScanTickers,
		sorter: TickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot>,
		kineticsCalculator: LeaderboardKineticsCalculator
	): Promise<LeaderboardRestTickerSnapshot[]> {
		const leaderboard: LeaderboardRestTickerSnapshot[] = [];
		const leaderboardTag = data.scan_strategy_tag;

		// Create leaderboard in storage if it doesn't exist
		if (!this.storage.getCurrentLeaderboard(leaderboardTag)) this.storage.createLeaderboard(leaderboardTag);

		for (const snapshot of data.normalized_tickers) {
			await this.storage.storeSnapshot(leaderboardTag, snapshot.ticker, snapshot);

			const history = await this.storage.retrieveAllSnapshotsForTicker(leaderboardTag, snapshot.ticker);

			// Skip if not enough history for that ticker
			if (history.length < APP_CONFIG.MIN_LEADERBOARD_SNAPSHOT_HISTORY_COUNT) continue;

			const velocity = kineticsCalculator.computeVelocity(history.slice(0, 2));
			const acceleration = kineticsCalculator.computeAcceleration(history.slice(0, 3));

			leaderboard.push({
				ticker: snapshot.ticker,
				timestamp: snapshot.timestamp,
				velocity,
				acceleration,
				score: velocity + 0.5 * acceleration,
				leaderboard_rank: snapshot.sort_rank,
			});
		}

		const sorted = sorter.sort(leaderboard);
		sorted.forEach((snapshot, idx) => (snapshot.leaderboard_rank = idx + 1));

		await this.storage.setLeaderboard(leaderboardTag, sorted);
		return sorted;
	}

	async getCurrentLeaderboard(leaderboardTag: string): Promise<LeaderboardRestTickerSnapshot[] | null> {
		return this.storage.getCurrentLeaderboard(leaderboardTag);
	}
}
