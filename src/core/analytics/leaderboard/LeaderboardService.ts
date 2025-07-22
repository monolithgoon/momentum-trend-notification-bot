import { leaderboardScoringFnType, scoringStrategies } from "./scoringStrategies";
import { TaggedNormalizedMarketScanTickers } from "@core/data/snapshots/rest_api/types/tagged-market-scan-tickers.interface";
import { LeaderboardRestTickerSnapshot } from "@data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";
import { LeaderboardStorage } from "./leaderboardStorage.interface";
import { GenericTickerSorter } from "@core/generics/GenericTickerSorter.interface";
import { kineticsCalculators } from "./kineticsCalculators";
import { APP_CONFIG } from "@config/index";

/**
 * LeaderboardService
 *
 * Current Algorithm for Putting a Ticker on the Leaderboard
 * (Updated for Pop-up & Longevity Detection)
 *
 * Purpose:
 *   - Detect stocks ("tickers") that rapidly appear and move up the leaderboard (pop-ups).
 *   - Favor tickers with strong short-term moves and penalize those that linger.
 *
 * Input:
 *   - Batch of normalized ticker snapshots (data.normalized_tickers), each representing a ticker's state at a moment.
 *   - Scan strategy tag to identify the leaderboard context.
 *
 * Steps:
 * 1. Initialization:
 *    - Extract leaderboard tag from input.
 *    - Ensure leaderboard store exists for this tag.
 *
 * 2. For Each Snapshot in the Batch:
 *    a. Store Snapshot:
 *       - Save the current snapshot for the ticker and tag to persistent storage.
 *    b. Retrieve Snapshot History:
 *       - Fetch recent snapshots for this ticker and tag (e.g., last 3).
 *    c. History Length Check:
 *       - If history is too short (less than required), skip further processing for this ticker.
 *    d. Calculate Kinetics:
 *       - Compute velocity and acceleration using most recent snapshots (based on change_pct and timestamp).
 *    e. Create Leaderboard Entry:
 *       - Create an entry containing:
 *           - ticker, timestamp, velocity, acceleration, original sort_rank
 *           - consecutiveAppearances: how many consecutive batches the ticker has been on the leaderboard
 *           - score: calculated using velocity, acceleration, and consecutiveAppearances (see scoring strategy below)
 *       - Add to in-memory leaderboard map.
 *
 * 3. Merge with Previous Leaderboard:
 *    - For tickers present in both batches, increment consecutiveAppearances.
 *    - For new tickers, set consecutiveAppearances to 1.
 *    - For absent tickers (present last time but missing now), increment their consecutiveAppearances and retain them.
 *
 * 4. Scoring:
 *    - For each leaderboard entry, compute score using:
 *        score = velocity + 0.5 * acceleration
 *        if consecutiveAppearances == 1: add popBonus (e.g. 1.5)
 *        apply decay: score *= decayFactor^(consecutiveAppearances - 1) (e.g. decayFactor = 0.95)
 *    - This boosts new "pop-up" tickers and penalizes those that linger.
 *
 * 5. Sorting and Ranking:
 *    - Sort leaderboard by score (descending).
 *    - Assign leaderboard_rank (starting from 1).
 *
 * 6. Persistence:
 *    - Save updated, ranked leaderboard to persistent storage.
 *
 * 7. Output:
 *    - Return sorted and ranked leaderboard array.
 *
 * Summary:
 *   - Each batch detects fresh and fast-moving tickers, favoring new "pop-ups."
 *   - Tickers that linger are progressively penalized, keeping the leaderboard dynamic.
 *   - Velocity and acceleration are computed from change_pct and timestamp.
 *   - The algorithm is modular: scoring strategy can be swapped for experimentation.
 */

export class LeaderboardService {
	constructor(
		private readonly storage: LeaderboardStorage,
		private readonly scoreFn: leaderboardScoringFnType = scoringStrategies.popUpDecay // default scoring fn.
	) {}

	/**
	 * Processes a batch of ticker snapshots, updates the leaderboard,
	 * scores each ticker based on velocity, acceleration, and appearance count,
	 * sorts and ranks the leaderboard, then persists and returns the results.
	 */
	async processSnapshots(
		data: TaggedNormalizedMarketScanTickers,
		sorter: GenericTickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot>
	): Promise<LeaderboardRestTickerSnapshot[]> {
		const leaderboardTag = data.scan_strategy_tag;
		await this.initializeLeaderboardIfMissing(leaderboardTag);

		const batchMap = await this.processBatchSnapshots(data, leaderboardTag);
		const mergedMap = await this.mergeWithPreviousLeaderboard(leaderboardTag, batchMap);

		// Compute scores now that appearances are updated
		for (const entry of mergedMap.values()) {
			entry.score = this.scoreFn({
				velocity: entry.velocity,
				acceleration: entry.acceleration,
				consecutiveAppearances: entry.consecutiveAppearances ?? 1,
			});
		}

		const rankedLeaderboard = this.sortAndRankLeaderboard(Array.from(mergedMap.values()), sorter);

		await this.persistLeaderboard(leaderboardTag, rankedLeaderboard);
		return rankedLeaderboard;
	}

	/**
	 * Ensures that a leaderboard store exists for the given tag.
	 * Creates a new store if one does not exist.
	 */
	private async initializeLeaderboardIfMissing(leaderboardTag: string): Promise<void> {
		await this.storage.initializeLeaderboardStore(leaderboardTag);
	}

	/**
	 * Processes each ticker snapshot in the current batch:
	 * - Stores the snapshot
	 * - Retrieves recent history for kinetics calculations
	 * - Computes velocity and acceleration
	 * - Creates leaderboard entry with initial consecutive appearance count
	 * Returns a map of ticker symbols to their leaderboard entries.
	 */
	private async processBatchSnapshots(
		data: TaggedNormalizedMarketScanTickers,
		leaderboardTag: string
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
					continue;
				}
				const velocity = kineticsCalculators.computeVelocity(history.slice(0, 2));
				const acceleration = kineticsCalculators.computeAcceleration(history.slice(0, 3));
				// We'll update consecutiveAppearances after merging
				const leaderboardEntry: LeaderboardRestTickerSnapshot = {
					ticker: snapshot.ticker,
					timestamp: snapshot.timestamp,
					velocity,
					acceleration,
					score: 0, // Temp, will compute after appearances set
					leaderboard_rank: snapshot.sort_rank,
					consecutiveAppearances: 1, // Default to 1, will update in merge step
				};
				tickerEntries.set(snapshot.ticker, leaderboardEntry);
			} catch (err) {
				console.error(`[LeaderboardService] Error processing snapshot for ${snapshot.ticker}:`, err);
			}
		}
		return tickerEntries;
	}

	/**
	 * Merges the current batch of leaderboard entries with the previous leaderboard:
	 * - Increments consecutive appearance counts for persistent tickers
	 * - Sets appearance count to 1 for new tickers
	 * - Preserves entries for tickers absent in the current batch
	 * Returns a map of ticker symbols to their updated leaderboard entries.
	 */
	private async mergeWithPreviousLeaderboard(
		leaderboardTag: string,
		currentBatchMap: Map<string, LeaderboardRestTickerSnapshot>
	): Promise<Map<string, LeaderboardRestTickerSnapshot>> {
		const mergedMap = new Map(currentBatchMap);
		try {
			const previous = await this.storage.retreiveLeaderboard(leaderboardTag);
			if (previous && previous.length > 0) {
				for (const entry of previous) {
					const current = mergedMap.get(entry.ticker);
					if (current) {
						// Ticker was present last time and still present
						current.consecutiveAppearances = (entry.consecutiveAppearances ?? 0) + 1;
					} else {
						// Keep previous entry if not present in current batch
						entry.consecutiveAppearances = (entry.consecutiveAppearances ?? 0) + 1;
						mergedMap.set(entry.ticker, entry);
					}
				}
				// For new entries not present previously, set appearances to 1
				for (const [ticker, entry] of mergedMap) {
					if (!previous.some((prev) => prev.ticker === ticker)) {
						entry.consecutiveAppearances = 1;
					}
				}
			} else {
				// First run, set appearances to 1 for all
				for (const entry of mergedMap.values()) {
					entry.consecutiveAppearances = 1;
				}
			}
		} catch (err) {
			console.error(`[LeaderboardService] Error retrieving previous leaderboard for merging:`, err);
		}
		return mergedMap;
	}

	/**
	 * Sorts leaderboard entries by score using the provided sorter,
	 * assigns sequential ranks, and returns the sorted array.
	 */
	private sortAndRankLeaderboard(
		entries: LeaderboardRestTickerSnapshot[],
		sorter: GenericTickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot>
	): LeaderboardRestTickerSnapshot[] {
		const sorted = sorter.sort(entries);
		sorted.forEach((snapshot, idx) => (snapshot.leaderboard_rank = idx + 1));
		return sorted;
	}

	/**
	 * Persists the updated leaderboard for the given tag to storage.
	 */
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

	/**
	 * Retrieves the current leaderboard for the given tag from storage.
	 */
	async retreiveLeaderboard(leaderboardTag: string): Promise<LeaderboardRestTickerSnapshot[] | null> {
		return this.storage.retreiveLeaderboard(leaderboardTag);
	}
}
