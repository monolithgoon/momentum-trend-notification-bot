import { leaderboardScoringFnType, scoringStrategies } from "./scoringStrategies";
import { TaggedNormalizedMarketScanTickers } from "@core/data/snapshots/rest_api/types/tagged-market-scan-tickers.interface";
import { LeaderboardRestTickerSnapshot } from "@data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";
import { LeaderboardStorage } from "./leaderboardStorage.interface";
import { GenericTickerSorter } from "@core/generics/GenericTickerSorter.interface";
import { percChangeKineticsCalculators } from "./percChangeKineticsCalculators";
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
 *       - Save the newTicker snapshot for the ticker and tag to persistent storage.
 *    b. Retrieve Snapshot History:
 *       - Fetch recent snapshots for this ticker and tag (e.g., last 3).
 *    c. History Length Check:
 *       - If history is too short (less than required), skip further processing for this ticker.
 *    d. Calculate Kinetics:
 *       - Compute perc_change_velocity and perc_change_acceleration using most recent snapshots (based on change_pct and timestamp).
 *    e. Create Leaderboard Entry:
 *       - Create an entry containing:
 *           - ticker, timestamp, perc_change_velocity, perc_change_acceleration, original ordinal_sort_position
 *           - num_consecutive_appearances: how many consecutive batches the ticker has been on the leaderboard
 *           - leaderboard_momentum_score: calculated using perc_change_velocity, perc_change_acceleration, and num_consecutive_appearances (see scoring strategy below)
 *       - Add to in-memory leaderboard map.
 *
 * 3. Merge with Previous Leaderboard:
 *    - For tickers present in both batches, increment num_consecutive_appearances.
 *    - For new tickers, set num_consecutive_appearances to 1.
 *    - For absent tickers (present last time but missing now), increment their num_consecutive_appearances and retain them.
 *
 * 4. Scoring:
 *    - For each leaderboard entry, compute leaderboard_momentum_score using:
 *        leaderboard_momentum_score = perc_change_velocity + 0.5 * perc_change_acceleration
 *        if num_consecutive_appearances == 1: add popBonus (e.g. 1.5)
 *        apply decay: leaderboard_momentum_score *= decayFactor^(num_consecutive_appearances - 1) (e.g. decayFactor = 0.95)
 *    - This boosts new "pop-up" tickers and penalizes those that linger.
 *
 * 5. Sorting and Ranking:
 *    - Sort leaderboard by leaderboard_momentum_score (descending).
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
 *   - Velocity and perc_change_acceleration are computed from change_pct and timestamp.
 *   - The algorithm is modular: scoring strategy can be swapped for experimentation.
 */

/**
 * Service for managing and processing leaderboard data for market ticker momentum analysis.
 *
 * The `LeaderboardService` coordinates the storage, scoring, ranking, and retrieval of leaderboard entries
 * based on batches of normalized market scan ticker snapshots. It supports customizable scoring strategies,
 * handles appearance counts for tickers, and ensures leaderboard persistence and retrieval.
 *
 * ### Responsibilities
 * - Initializes leaderboard storage for specific tags.
 * - Stores new ticker snapshots and maintains historical data for kinetics calculations.
 * - Calculates velocity and acceleration metrics for tickers.
 * - Merges newTicker batch data with oldEntries leaderboard state, updating consecutive appearance counts.
 * - Scores tickers using a configurable scoring function.
 * - Sorts and ranks leaderboard entries using a provided sorter.
 * - Persists updated leaderboard data.
 * - Retrieves leaderboard data for a given tag.
 *
 * ### Usage
 * Construct with a storage implementation and an optional scoring function.
 * Use `processNewSnapshots` to process a batch of ticker data and update the leaderboard.
 *
 * @example
 * const service = new LeaderboardService(storage, scoringStrategies.popUpDecay);
 * const ranked = await service.processNewSnapshots(data, sorter);
 *
 * @see LeaderboardStorage
 * @see leaderboardScoringFnType
 * @see LeaderboardRestTickerSnapshot
 * @see GenericTickerSorter
 */
export class LeaderboardService {
	constructor(
		private readonly storage: LeaderboardStorage,
		private readonly scoreFn: leaderboardScoringFnType = scoringStrategies.popUpDecay // default scoring fn.
	) {}

	/**
	 * Processes a batch of ticker snapshots, updates the leaderboard,
	 * scores each ticker based on perc_change_velocity, perc_change_acceleration, and appearance count,
	 * sorts and ranks the leaderboard, then persists and returns the results.
	 */

	async processNewSnapshots(
		data: TaggedNormalizedMarketScanTickers,
		sorter: GenericTickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot>
	): Promise<LeaderboardRestTickerSnapshot[]> {
		const leaderboardTag = data.scan_strategy_tag;
		await this.initializeLeaderboardIfMissing(leaderboardTag);
		await this.storeNewSnapshots(data, leaderboardTag); // store the new snapshots in the leaderboard storage
		const newBatchMap = await this.computeNewBatchKinetics(data, leaderboardTag); // process each snapshot in the batch
		const mergedUpdatedBatchMap = await this.mergeWithExistingLeaderboard(leaderboardTag, newBatchMap); // merge with oldEntries leaderboard

		// Compute scores now that appearances are updated
		for (const newEntry of mergedUpdatedBatchMap.values()) {
			newEntry.leaderboard_momentum_score = this.scoreFn({
				perc_change_velocity: newEntry.perc_change_velocity,
				perc_change_acceleration: newEntry.perc_change_acceleration,
				num_consecutive_appearances: newEntry.num_consecutive_appearances ?? 1,
			});
		}

		const rankedLeaderboard = this.sortAndRankLeaderboard(Array.from(mergedUpdatedBatchMap.values()), sorter);

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

	// TODO
	// I feel like the velocity and acceleration calculations are too tightly coupled with the methods in the leaderboard service. Would it not be better to have them calculated in a dedicated scoring function
	/**
	 * Stores new ticker snapshots in the leaderboard storage.
	 * - Each snapshot is stored with its ticker name and the associated leaderboard tag.
	 * @param data - TaggedNormalizedMarketScanTickers containing the snapshots to store.
	 * @param leaderboardTag - The tag identifying the leaderboard context for storage.
	 */
	private async storeNewSnapshots(data: TaggedNormalizedMarketScanTickers, leaderboardTag: string): Promise<void> {
		for (const snapshot of data.normalized_tickers) {
			try {
				await this.storage.storeSnapshot(leaderboardTag, snapshot.n_ticker_name, snapshot);
			} catch (err) {
				console.error(`[LeaderboardService] Error storing snapshot for ${snapshot.n_ticker_name}:`, err);
			}
		}
	}

	/**
	 * Processes each ticker snapshot in the newTicker batch:
	 * - Stores the snapshot
	 * - Retrieves recent history for kinetics calculations
	 * - Computes perc_change_velocity and perc_change_acceleration
	 * - Creates leaderboard oldEntry with initial consecutive appearance count
	 * Returns a map of ticker symbols to their leaderboard entries.
	 */
	private async computeNewBatchKinetics(
		data: TaggedNormalizedMarketScanTickers,
		leaderboardTag: string
	): Promise<Map<string, LeaderboardRestTickerSnapshot>> {
		const tickerEntries: Map<string, LeaderboardRestTickerSnapshot> = new Map();

		for (const snapshot of data.normalized_tickers) {
			try {
				const history = await this.storage.retrieveRecentSnapshots(
					leaderboardTag,
					snapshot.n_ticker_name,
					Math.max(3, APP_CONFIG.MIN_LEADERBOARD_TICKER_HISTORY_COUNT)
				);

				if (history.length < APP_CONFIG.MIN_LEADERBOARD_TICKER_HISTORY_COUNT) {
					continue;
				}

				const velocity = percChangeKineticsCalculators.computePercChangeVelocity(history);
				const acceleration = percChangeKineticsCalculators.computePercChangeAcceleration(history);
				// We'll update num_consecutive_appearances after merging
				const leaderboardEntry: LeaderboardRestTickerSnapshot = {
					ld_ticker_name: snapshot.n_ticker_name,
					timestamp: snapshot.timestamp,
					perc_change_velocity: velocity,
					perc_change_acceleration: acceleration,
					leaderboard_momentum_score: 0, // Temp, will compute after appearances set
					leaderboard_rank: snapshot.ordinal_sort_position, // Still 0-based as of here, I believe
					num_consecutive_appearances: 1,
					// TODO - WHY DID THIS DEFAULT TO UNDEFINED
					// FIXME ->
					change_pct: snapshot.change_pct,
				};

				// Assemble a key-value pair for the ticker oldEntry
				// This will be used to merge with previous leaderboard entries later
				tickerEntries.set(snapshot.n_ticker_name, leaderboardEntry);
			} catch (err) {
				console.error(`[LeaderboardService] Error processing snapshot for ${snapshot.n_ticker_name}:`, err);
			}
		}
		return tickerEntries;
	}

	/**
	 * Merges the newTicker batch of leaderboard entries with the previous leaderboard:
	 * - Increments consecutive appearance counts for persistent tickers
	 * - Sets appearance count to 1 for new tickers
	 * - Preserves entries for tickers absent in the newTicker batch
	 * Returns a map of ticker symbols to their updated leaderboard entries.
	 */
	private async mergeWithExistingLeaderboard(
		leaderboardTag: string,
		currentBatchMap: Map<string, LeaderboardRestTickerSnapshot>
	): Promise<Map<string, LeaderboardRestTickerSnapshot>> {
		const newBatchMap = new Map(currentBatchMap);
		let oldEntries: LeaderboardRestTickerSnapshot[] = [];

		try {
			const result = await this.storage.retreiveLeaderboard(leaderboardTag) ?? [];
			oldEntries = result ?? [];
		} catch (err) {
			console.error(`[LeaderboardService] Error retrieving previous leaderboard for merging:`, err);
			// Even if error, proceed with first run logic below
		}

		// If existing leaderboard is empty, set appearances for all tickers in curr. batch to 1 and return
		if (!oldEntries || oldEntries.length === 0) {
			for (const newEntry of newBatchMap.values()) {
				newEntry.num_consecutive_appearances = 1;
			}
			return newBatchMap;
		}

		// Evaluate previous existing entries
		for (const oldEntry of oldEntries) {
			const newTicker = newBatchMap.get(oldEntry.ld_ticker_name);
			if (newTicker) {
				// Ticker was present last time and still present
				newTicker.num_consecutive_appearances = (oldEntry.num_consecutive_appearances ?? 0) + 1;
			} else {
				// Ticker was present last time but is NOT in the current batch; retain it
				oldEntry.num_consecutive_appearances = (oldEntry.num_consecutive_appearances ?? 0) + 1;
				newBatchMap.set(oldEntry.ld_ticker_name, oldEntry);
			}
		}

		// For new entries not present before, set appearances to 1
		for (const [tickerName, newTickerEntry] of newBatchMap) {
			const wasPresentChk = oldEntries.some((prev) => prev.ld_ticker_name === tickerName);
			if (!wasPresentChk) {
				newTickerEntry.num_consecutive_appearances = 1;
			}
		}

		return newBatchMap;
	}
	/**
	 * Sorts leaderboard entries by leaderboard_momentum_score using the provided sorter,
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
	 * Retrieves the newTicker leaderboard for the given tag from storage.
	 */
	async retreiveLeaderboard(leaderboardTag: string): Promise<LeaderboardRestTickerSnapshot[] | null> {
		return this.storage.retreiveLeaderboard(leaderboardTag);
	}
}
