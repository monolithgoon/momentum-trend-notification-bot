import { leaderboardScoringFnType } from "./scoringStrategies";
import { TaggedNormalizedMarketScanTickers } from "@core/data/snapshots/rest_api/types/tagged-market-scan-tickers.interface";
import { LeaderboardRestTickerSnapshot } from "@data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";
import { LeaderboardStorage } from "./leaderboardStorage.interface";
import { GenericTickerSorter } from "@core/generics/GenericTickerSorter.interface";
import { kineticsCalculatorType } from "./kineticsCalculators";
import { APP_CONFIG } from "@config/index";

/**
 * LeaderboardService
 *
 * Current Algorithm for Putting a Ticker on the Leaderboard:
 *
 * Input:
 *   - Receives a batch (data.normalized_tickers) of one or more snapshots, each representing a ticker at a specific moment,
 *     along with a scan strategy tag.
 *
 * Steps:
 * 1. Initialization and Store Creation:
 *    - Extracts the leaderboard tag from the input.
 *    - Ensures a leaderboard store exists for this tag (creates if missing).
 *
 * 2. For Each Snapshot in the Batch:
 *    a. Store Snapshot:
 *       - Saves the current snapshot for the ticker and tag to storage (e.g., file, memory, or Redis).
 *       - Storage typically keeps only a limited number of recent snapshots per ticker (e.g., 5 or 10).
 *    b. Retrieve Snapshot History:
 *       - Reads all (or the most recent) snapshots for this ticker and leaderboard tag from storage.
 *    c. History Length Check:
 *       - If the history for this ticker is shorter than a configured minimum (e.g., 2 or 3), skips further processing for this ticker.
 *    d. Kinetics Calculation:
 *       - Calculates velocity using the two most recent snapshots.
 *       - Calculates acceleration using the three most recent snapshots.
 *    e. Create Leaderboard Entry:
 *       - Creates an entry for this ticker, containing:
 *           - Ticker symbol
 *           - Timestamp (from this snapshot)
 *           - Calculated velocity and acceleration
 *           - Score (velocity + 0.5 * acceleration)
 *           - The original snapshot’s sort_rank
 *       - Adds this entry to an in-memory leaderboard array.
 *
 * 3. Sorting and Ranking:
 *    - Sorts the leaderboard array using the supplied sorter.
 *    - Assigns a new rank (starting at 1) to each entry in the sorted array.
 *
 * 4. Persistence:
 *    - Persists (overwrites) the sorted leaderboard for the given tag in storage.
 *
 * 5. Output:
 *    - Returns the sorted and ranked leaderboard array.
 *
 * Summary (What Happens Per Ticker):
 *   For every snapshot in the current batch:
 *     - Store the snapshot.
 *     - Gather all recent snapshots for that ticker.
 *     - If enough history, calculate velocity and acceleration.
 *     - Add a new leaderboard entry for this ticker (and timestamp) to the leaderboard.
 */

export class LeaderboardService {
	private readonly scoreFn: leaderboardScoringFnType;

	constructor(private readonly storage: LeaderboardStorage, scoreFn: leaderboardScoringFnType) {
		this.scoreFn = scoreFn;
	}

	async processSnapshots(
		data: TaggedNormalizedMarketScanTickers,
		sorter: GenericTickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot>,
		kineticsCalculator: kineticsCalculatorType
	): Promise<LeaderboardRestTickerSnapshot[]> {
		const leaderboardTag = data.scan_strategy_tag;
		await this.initializeLeaderboardIfMissing(leaderboardTag);

		const batchMap = await this.processBatchSnapshots(data, leaderboardTag, kineticsCalculator);
		const mergedMap = await this.mergeWithPreviousLeaderboard(leaderboardTag, batchMap);
		const rankedLeaderboard = this.sortAndRankLeaderboard(Array.from(mergedMap.values()), sorter);

		await this.persistLeaderboard(leaderboardTag, rankedLeaderboard);

		return rankedLeaderboard;
	}

	private async initializeLeaderboardIfMissing(leaderboardTag: string): Promise<void> {
		await this.storage.initializeLeaderboardStore(leaderboardTag);
	}

	private async processBatchSnapshots(
		data: TaggedNormalizedMarketScanTickers,
		leaderboardTag: string,
		kineticsCalculator: kineticsCalculatorType
	): Promise<Map<string, LeaderboardRestTickerSnapshot>> {
		const tickerEntries: Map<string, LeaderboardRestTickerSnapshot> = new Map();

		for (const snapshot of data.normalized_tickers) {
			try {
				await this.storage.storeSnapshot(leaderboardTag, snapshot.ticker, snapshot);
				const history = await this.storage.retrieveRecentSnapshots(
					leaderboardTag,
					snapshot.ticker,
					Math.max(3, APP_CONFIG.MIN_LEADERBOARD_TICKER_HISTORY_COUNT)
				);

				if (history.length < APP_CONFIG.MIN_LEADERBOARD_TICKER_HISTORY_COUNT) {
					console.log(`[LeaderboardService] Skipping ${snapshot.ticker} - not enough history.`);
					continue;
				}
				const velocity = kineticsCalculator.computeVelocity(history.slice(0, 2));
				const acceleration = kineticsCalculator.computeAcceleration(history.slice(0, 3));
				const leaderboardScore = this.scoreFn({
					velocity,
					acceleration,
					change_pct: snapshot.change_pct,

					// Optionally add more fields if your strategy or future strategies require them
				});
				const leaderboardEntry: LeaderboardRestTickerSnapshot = {
					ticker: snapshot.ticker,
					timestamp: snapshot.timestamp,
					velocity,
					acceleration,
					score: leaderboardScore,
					leaderboard_rank: snapshot.sort_rank,
				};
				const existing = tickerEntries.get(snapshot.ticker);
				if (!existing || leaderboardEntry.timestamp > existing.timestamp) {
					tickerEntries.set(snapshot.ticker, leaderboardEntry);
				}
			} catch (err) {
				console.error(`[LeaderboardService] Error processing snapshot for ${snapshot.ticker}:`, err);
			}
		}
		return tickerEntries;
	}

	private async mergeWithPreviousLeaderboard(
		leaderboardTag: string,
		currentBatchMap: Map<string, LeaderboardRestTickerSnapshot>
	): Promise<Map<string, LeaderboardRestTickerSnapshot>> {
		const mergedMap = new Map(currentBatchMap);
		try {
			const previous = await this.storage.retreiveLeaderboard(leaderboardTag);
			if (previous && previous.length > 0) {
				for (const entry of previous) {
					if (!mergedMap.has(entry.ticker)) {
						mergedMap.set(entry.ticker, entry);
					}
				}
			}
		} catch (err) {
			console.error(`[LeaderboardService] Error retrieving previous leaderboard for merging:`, err);
		}
		return mergedMap;
	}

	private sortAndRankLeaderboard(
		entries: LeaderboardRestTickerSnapshot[],
		sorter: GenericTickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot>
	): LeaderboardRestTickerSnapshot[] {
		const sorted = sorter.sort(entries);
		sorted.forEach((snapshot, idx) => (snapshot.leaderboard_rank = idx + 1));
		return sorted;
	}

	private async persistLeaderboard(
		leaderboardTag: string,
		leaderboard: LeaderboardRestTickerSnapshot[]
	): Promise<void> {
		try {
			await this.storage.persistLeaderboard(leaderboardTag, leaderboard);
		} catch (err) {
			console.error(`[LeaderboardService] Error persisting leaderboard:`, err);
			throw err;
		}
	}

	async retreiveLeaderboard(leaderboardTag: string): Promise<LeaderboardRestTickerSnapshot[] | null> {
		return this.storage.retreiveLeaderboard(leaderboardTag);
	}
}
