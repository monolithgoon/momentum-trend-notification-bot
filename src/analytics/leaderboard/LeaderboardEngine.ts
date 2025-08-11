import { APP_CONFIG_2 } from "src/config_2/app_config";
import { ITaggedLeaderboardSnapshotsBatch_2 } from "./types/ITaggedLeaderboardSnapshotsBatch.interface_2";
import { ILeaderboardStorage } from "./types/ILeaderboardStorage.interface";
import { LeaderboardTickerSnapshotsSorter_2 } from "./LeaderboardTickerSnapshotsSorter_2";
import { pruneStaleLeaderboardTickers } from "./helpers/pruneOldTickers";
import { computeAggregateRank, computeKineticsRanks, getFinalLeaderboardRank } from "./helpers/computeKineticsRanks";
import { mergeWithExistingLeaderboard_3 } from "./helpers/mergeWithExistingLeaderboard_2 copy";
import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { computeNewBatchKinetics_2 } from "./helpers/computeNewBatchKinetics_2";

export class LeaderboardEngine {
	constructor(
		private readonly storage: ILeaderboardStorage,
		private readonly sorter: LeaderboardTickerSnapshotsSorter_2
	) {}

	/**
	 * Builds or updates a ranked leaderboard from a new batch of ticker snapshots.
	 *
	 * - Computes momentum/volume velocity + acceleration
	 * - Merges current batch with existing stored leaderboard
	 * - Tracks absence/inactivity
	 * - Computes sub-leaderboard ranks
	 * - Sorts and trims final leaderboard
	 */

	public async start(data: ITaggedLeaderboardSnapshotsBatch_2): Promise<ILeaderboardTickerSnapshot_2[]> {
		const leaderboardTag: string = data.scan_strategy_tag;
		const snapshots = data.normalized_leaderboard_tickers;

		// Ensure leaderboard store exists
		await this.initializeLeaderboardIfMissing(leaderboardTag);

		// Pre-processing: create map of new batch
		const newBatchMap = new Map(snapshots.map((s) => [s.ticker_symbol__ld_tick, s]));

		// Step 1: Compute kinetics on incoming batch
		const enrichedBatchMap = await computeNewBatchKinetics_2(newBatchMap, leaderboardTag, this.storage);

		// Step 2: Load and prune stale historical leaderboard data
		const persistedLeaderboard = await this.storage.retrieveLeaderboard(leaderboardTag);
		const prunedLeaderboardTickers = pruneStaleLeaderboardTickers(persistedLeaderboard ?? []);
		const prunedLeaderboardMap = new Map(
			prunedLeaderboardTickers.map((ticker) => [ticker.ticker_symbol__ld_tick, ticker])
		);

		// Step 4: Merge current batch into stored leaderboard
		const mergedMap = mergeWithExistingLeaderboard_3(prunedLeaderboardMap, enrichedBatchMap);

		console.log(Array.from(mergedMap.values()));

		// Step 5: Compute sub-leaderboard rankings
		const snapsWithRankedKineticsMap = computeKineticsRanks(mergedMap);

		// Step 6: Compute aggregate rankings
		const snapsWithAggKineticsMap = computeAggregateRank(Array.from(snapsWithRankedKineticsMap.values()));

		// Store new snapshots at the end, after all enrichments
		await this.appendHisoricalSnapshots([...snapsWithAggKineticsMap.values()], leaderboardTag);

		// Step 7: Sort and trim the leaderboard
		const finalLeaderboard_2 = getFinalLeaderboardRank(
			Array.from(snapsWithAggKineticsMap.values()),
			this.sorter
		).slice(0, APP_CONFIG_2.leaderboard.maxLeaderboardSnapshotLength);

		// Step 8: Persist final leaderboard
		await this.storage.persistLeaderboard(leaderboardTag, finalLeaderboard_2);

		return finalLeaderboard_2;
	}

	/**
	 * Ensures that a leaderboard store exists for the given tag.
	 * Creates a new store if one does not exist.
	 */

	private async initializeLeaderboardIfMissing(leaderboardTag: string): Promise<void> {
		await this.storage.initializeLeaderboardStore(leaderboardTag);
	}

	/**
	 * Persists a new batch of leaderboard ticker snapshots to the storage backend.
	 *
	 * Each snapshot is stored under its corresponding ticker name, namespaced by the provided leaderboard tag.
	 * This enables retrieval of per-ticker snapshot history across multiple scans for further analytics (e.g., velocity/acceleration).
	 *
	 */

	private async appendHisoricalSnapshots(snapshots: ILeaderboardTickerSnapshot_2[], leaderboardTag: string): Promise<void> {
		for (const snapshot of snapshots) {
			try {
				await this.storage.storeSnapshot(leaderboardTag, snapshot.ticker_symbol__ld_tick, snapshot);
			} catch (err) {
				console.error(`[LeaderboardService] Error storing snapshot for ${snapshot.ticker_symbol__ld_tick}:`, err);
			}
		}
	}
}
