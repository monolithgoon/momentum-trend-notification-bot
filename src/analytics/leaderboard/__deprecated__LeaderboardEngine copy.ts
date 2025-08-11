import { ITaggedLeaderboardSnapshotsBatch } from "@core/models/rest_api/ITaggedLeaderboardSnapshotsBatch.interface";
import { RankedLeaderboardTicker } from "./types/__deprecated__RankedLeaderboardTicker.interface";
import { ILeaderboardStorage } from "./types/ILeaderboardStorage.interface";
import { GenericTickerSorter } from "@core/generics/GenericTickerSorter.interface";
import { LEADERBOARD_PRUNE_CONFIG } from "@config/constants";

import { pruneStaleLeaderboardTickers } from "./helpers/pruneStaleLeaderboardTickers";
import { addAppearancesField } from "./helpers/__deprecated__addAppearancesField";
import { updatePresenceCounters } from "./helpers/updatePresenceCounters";
import { computeKineticsRanks } from "./helpers/computeKineticsRanks";
// import { mergeWithExistingLeaderboard } from "./helpers/mergeWithExistingLeaderboard";
import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/LeaderboardRestTickerSnapshot.interface";
import { computeNewBatchKinetics } from "./helpers/__deprecated__computeNewBatchKinetics";
import { mergeWithExistingLeaderboard } from "./helpers/__deprecated__mergeWithExistingLeaderboard";

export class LeaderboardEngine {
	constructor(
		private readonly storage: ILeaderboardStorage,
		private readonly sorter: GenericTickerSorter<RankedLeaderboardTicker, RankedLeaderboardTicker>
	) {}

	/**
	 * Ranks and updates the leaderboard by:
	 * - Storing the incoming batch
	 * - Computing per-ticker kinetics
	 * - Merging with prior leaderboard history
	 * - Computing virtual sub-leaderboard ranks
	 * - Pruning stale/inactive tickers
	 * - Sorting and trimming the final leaderboard
	 */

	public async orchestrateLeaderboard(data: ITaggedLeaderboardSnapshotsBatch): Promise<ITaggedLeaderboardSnapshotsBatch> {
		const leaderboardTag = data.scan_strategy_tag;
		const snapshots = data.normalized_leaderboard_tickers;

		// Ensure leaderboard store exists and save new batch
		await this.initializeLeaderboardIfMissing(leaderboardTag);
		await this.storeNewSnapshots(data, leaderboardTag);

		// Pre-processing: create map of new batch
		const newBatchMap = new Map(snapshots.map((s) => [s.ticker_symbol__ld_tick, s]));

		// Compute kinetics on incoming batch
		const enrichedNewBatchMap = await computeNewBatchKinetics(newBatchMap, leaderboardTag, this.storage);

		// Load and prune historical leaderboard data
		const storedLeaderboard = await this.storage.retrieveLeaderboard(leaderboardTag);
		const existingLbSnapshots = pruneStaleLeaderboardTickers(storedLeaderboard);
		const existingSnapshotsMap = new Map(
			existingLbSnapshots.map((snapshot) => [snapshot.ticker_symbol__ld_tick, snapshot])
		);

		// ✅ Guard against first run
		if (historicalMap.size === 0) {
			for (const enriched of enrichedBatchMap.values()) {
				enriched.num_consecutive_absences = 0;
			}
		}

		// 🔄 Step 1: Update inactivity counters for tickers no longer in the current batch
		updatePresenceCounters(existingSnapshotsMap, enrichedNewBatchMap);

		// 🧬 Step 2: Merge current batch into stored leaderboard snapshot map
		const mergedMap = mergeWithExistingLeaderboard(existingSnapshotsMap, enrichedNewBatchMap);

		// 🧮 Step 3: Compute sub-leaderboard ranks across the full merged set
		const rankedSnapshotsMap = computeKineticsRanks(mergedMap);

		// Step 4: Assign leaderboard rank & momentum score
		const rankedLeaderboard = this.computeScoresAndRankings(Array.from(rankedSnapshotsMap.values()), this.sorter);

		// 🔢 Step 4: Sort leaderboard and enforce max size constraint
		const finalLeaderboard = this.sorter
			.sort(Array.from(rankedLeaderboard.values()))
			.slice(0, LEADERBOARD_PRUNE_CONFIG.maxLeaderboardSize);

		// 💾 Step 5: Persist and return the finalized leaderboard
		await this.storage.persistLeaderboard(leaderboardTag, finalLeaderboard);

		return {
			scan_strategy_tag: leaderboardTag,
			normalized_leaderboard_tickers: finalLeaderboard,
		};
	}
}
