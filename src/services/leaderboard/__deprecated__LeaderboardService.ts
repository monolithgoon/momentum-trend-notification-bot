import { APP_CONFIG_2 } from "src/config_2/app_config";
import { ITaggedLeaderboardSnapshotsBatch } from "@core/models/rest_api/ITaggedLeaderboardSnapshotsBatch.interface";
import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/LeaderboardRestTickerSnapshot.interface";
import { GenericTickerSorter } from "@core/generics/GenericTickerSorter.interface";
import { LeaderboardStorage } from "./LeaderboardStorage.interface";
import { KineticsCalculator } from "./KineticsCalculator";
import { LeaderboardScoringFnType, scoringStrategies } from "./scoringStrategies";

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
 *   - Batch of normalized ticker snapshots (data.normalized_leaderboard_tickers), each representing a ticker's state at a moment.
 *   - Scan strategy tag to identify the leaderboard context.
 *
 * Steps:
 * 1. Initialization:
 *    - Extract leaderboard tag from input.
 *    - Ensure leaderboard store exists for this tag.
 *
 * 2. for Each Snapshot in the Batch:
 *    a. Store Snapshot:
 *       - Save the newTicker snapshot for the ticker and tag to persistent storage.
 *    b. Retrieve Snapshot History:
 *       - Fetch recent snapshots for this ticker and tag (e.g., last 3).
 *    c. History Length Check:
 *       - If history is too short (less than required), skip further processing for this ticker.
 *    d. Calculate Kinetics:
 *       - Compute pct_change_velocity and pct_change_acceleration using most recent snapshots (based on change_pct and timestamp).
 *    e. Create Leaderboard Entry:
 *       - Create an entry containing:
 *           - ticker, timestamp, pct_change_velocity, pct_change_acceleration
 *           - num_consecutive_appearances: how many consecutive batches the ticker has been on the leaderboard
 *           - leaderboard_momentum_score: calculated using pct_change_velocity, pct_change_acceleration, and num_consecutive_appearances (see scoring strategy below)
 *       - Add to in-memory leaderboard map.
 *
 * 3. Merge with Previous Leaderboard:
 *    - for tickers present in both batches, increment num_consecutive_appearances.
 *    - for new tickers, set num_consecutive_appearances to 1.
 *    - for absent tickers (present last time but missing now), increment their num_consecutive_appearances and retain them.
 *
 * 4. Scoring:
 *    - for each leaderboard entry, compute leaderboard_momentum_score using:
 *        leaderboard_momentum_score = pct_change_velocity + 0.5 * pct_change_acceleration
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
 *   - Velocity and pct_change_acceleration are computed from change_pct and timestamp.
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
 * Use `rankAndUpdateLeaderboard` to process a batch of ticker data and update the leaderboard.
 *
 * @example
 * const service = new LeaderboardService(storage, scoringStrategies.popUpDecay);
 * const ranked = await service.rankAndUpdateLeaderboard(data, sorter);
 *
 * @see LeaderboardStorage
 * @see LeaderboardScoringFnType
 * @see LeaderboardRestTickerSnapshot
 * @see GenericTickerSorter
 */
export class LeaderboardService {
	constructor(
		private readonly storage: LeaderboardStorage,
		private readonly computeLeaderboardScoreFn: LeaderboardScoringFnType
	) {}

	/**
	 * Processes a batch of ticker snapshots, updates the leaderboard,
	 * scores each ticker based on volume & pct. change velocity & acceleration kinetics calculations and appearance count,
	 * sorts and ranks the leaderboard, then persists and returns the results.
	 */
	public async rankAndUpdateLeaderboard(
		data: ITaggedLeaderboardSnapshotsBatch,
		sorter: GenericTickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot>
	): Promise<LeaderboardRestTickerSnapshot[]> {
		const leaderboardTag = data.scan_strategy_tag;

		await this.initializeLeaderboardIfMissing(leaderboardTag);
		await this.storeNewSnapshots(data, leaderboardTag); // store the new snapshots to the storage interface (file, in-memory, redis, etc)

		const newBatchMap = await this.computeNewBatchKinetics(data, leaderboardTag); // process each snapshot in the batch
		const mergedUpdatedBatchMap = await this.mergeWithExistingLeaderboard(leaderboardTag, newBatchMap); // merge with oldEntries leaderboard
		const rankedLeaderboard = this.computeScoresAndRankings(Array.from(mergedUpdatedBatchMap.values()), sorter);

		// Persist the updated leaderboard
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
	 * Stores new ticker snapshots in the leaderboard storage.
	 * - Each snapshot is stored with its ticker name and the associated leaderboard tag.
	 * @param data - ITaggedLeaderboardSnapshotsBatch containing the snapshots to store.
	 * @param leaderboardTag - The tag identifying the leaderboard context for storage.
	 */
	private async storeNewSnapshots(data: ITaggedLeaderboardSnapshotsBatch, leaderboardTag: string): Promise<void> {
		for (const snapshot of data.normalized_leaderboard_tickers) {
			try {
				await this.storage.storeSnapshot(leaderboardTag, snapshot.ticker_name__ld_tick, snapshot);
			} catch (err) {
				console.error(`[LeaderboardService] Error storing snapshot for ${snapshot.ticker_name__ld_tick}:`, err);
			}
		}
	}

	/**
	 * Processes each ticker snapshot in the newTicker batch:
	 * - Stores the snapshot
	 * - Retrieves recent history for kinetics calculations
	 * - Computes pct_change_velocity and pct_change_acceleration
	 * - Creates leaderboard oldEntry with initial consecutive appearance count
	 * Returns a map of ticker symbols to their leaderboard entries.
	 */
	private async computeNewBatchKinetics(
		data: ITaggedLeaderboardSnapshotsBatch,
		leaderboardTag: string
	): Promise<Map<string, LeaderboardRestTickerSnapshot>> {
		const tickerEntries: Map<string, LeaderboardRestTickerSnapshot> = new Map();

		for (const snapshot of data.normalized_leaderboard_tickers) {
			try {
				const snapshotHistory = await this.storage.readSnapshotHistoryForTicker(
					leaderboardTag,
					snapshot.ticker_name__ld_tick,
					Math.max(3, APP_CONFIG_2.leaderboard.minSnapshotsRequiredForKinetics) // Ensure we have enough history
				);

				if (snapshotHistory.length < APP_CONFIG_2.leaderboard.minSnapshotsRequiredForKinetics) {
					continue;
				}

				// Compute kinetics metrics
				// Note: computePercChangeVelocity and computePercChangeAcceleration expect history to be ordered

				const kinetics = new KineticsCalculator(snapshotHistory);
				const pcVel = kinetics.computeVelocity("pct_change_velocity__ld_tick");
				const pcAccel = kinetics.computeAcceleration("pct_change_acceleration__ld_tick");
				const volVel = kinetics.computeVelocity("volume__ld_tick");
				const volAccel = kinetics.computeVelocity("volume__ld_tick");

				// We'll update num_consecutive_appearances after merging with existing leaderboard
				const leaderboardEntry: LeaderboardRestTickerSnapshot = {
					ticker_name__ld_tick: snapshot.ticker_name__ld_tick,
					timestamp__ld_tick: snapshot.timestamp__ld_tick,
					change_pct__ld_tick: snapshot.change_pct__ld_tick,
					pct_change_velocity__ld_tick: pcVel,
					pct_change_acceleration__ld_tick: pcAccel,
					volume_velocity__ld_tick: volVel,
					volume_acceleration__ld_tick: volAccel,
					// TODO -> should this be -1 or 0
					leaderboard_rank: -1, // Temp; will be sorted by momentum score
					leaderboard_momentum_score: 0, // Temp; will compute after num_consecutive_appearances set
					num_consecutive_appearances: 1, // TODO 1 or 0????
					volume__ld_tick: 0,
					ticker_symbol__ld_tick: "",
					num_consecutive_absences: 0
				};

				// Assemble a key-value pair for the ticker oldEntry
				// This will be used to merge with previous leaderboard entries later
				tickerEntries.set(snapshot.ticker_name__ld_tick, leaderboardEntry);
			} catch (err) {
				console.error(`[LeaderboardService] Error processing snapshot for ${snapshot.ticker_name__ld_tick}:`, err);
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
			const result = (await this.storage.retrieveLeaderboard(leaderboardTag)) ?? [];
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
			const newTicker = newBatchMap.get(oldEntry.ticker_name__ld_tick);
			if (newTicker) {
				// Ticker was present last time and still present
				newTicker.num_consecutive_appearances = (oldEntry.num_consecutive_appearances ?? 0) + 1;
			} else {
				// Ticker was present last time but is NOT in the current batch; retain it
				oldEntry.num_consecutive_appearances = (oldEntry.num_consecutive_appearances ?? 0) + 1;
				newBatchMap.set(oldEntry.ticker_name__ld_tick, oldEntry);
			}
		}

		// for new entries not present before, set appearances to 1
		for (const [tickerName, newTickerEntry] of newBatchMap) {
			const wasPresentChk = oldEntries.some((prev) => prev.ticker_name__ld_tick === tickerName);
			if (!wasPresentChk) {
				newTickerEntry.num_consecutive_appearances = 1;
			}
		}

		return newBatchMap;
	}

	/**
	 * Computes the momentum score for each leaderboard entry using
	 * pct_change_velocity, pct_change_acceleration, and appearance count,
	 * then sorts the entries using the provided sorter and assigns sequential ranks.
	 * Returns the sorted and ranked leaderboard.
	 */

	private computeScoresAndRankings(
		entries: LeaderboardRestTickerSnapshot[],
		sorter: GenericTickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot>
	): LeaderboardRestTickerSnapshot[] {
		// Compute scores
		for (const entry of entries) {
			entry.leaderboard_momentum_score = this.computeLeaderboardScoreFn({
				changePct: entry.change_pct__ld_tick,
				volume: entry.volume__ld_tick,
				pctChangeVelocity: entry.pct_change_velocity__ld_tick,
				pctChangeAcceleration: entry.pct_change_acceleration__ld_tick,
				volumeVelocity: entry.volume_velocity__ld_tick,
				volumeAcceleration: entry.volume_acceleration__ld_tick,
				numConsecutiveAppearances: entry.num_consecutive_appearances,
			});
		}

		// Sort and rank
		const sorted = sorter.sort(entries); // Ordered by the field passed in the live mkt. scanner task
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
	async retrieveLeaderboard(leaderboardTag: string): Promise<LeaderboardRestTickerSnapshot[] | null> {
		return this.storage.retrieveLeaderboard(leaderboardTag);
	}
}
