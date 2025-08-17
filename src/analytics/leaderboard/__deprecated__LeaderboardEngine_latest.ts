import { APP_CONFIG_2 } from "src/config_2/app_config";
import { ITaggedLeaderboardSnapshotsBatch_2 } from "./types/ITaggedLeaderboardSnapshotsBatch.interface_2";
import { BulkUpsertReport, ILeaderboardStorage } from "./types/ILeaderboardStorage.interface";
import { LeaderboardTickerSnapshotsSorter_2 } from "./LeaderboardTickerSnapshotsSorter_2";
import { pruneStaleLeaderboardTickers } from "./helpers/pruneOldTickers";
import { computeAggregateRank, computeKineticsRanks, getFinalLeaderboardRank } from "./helpers/computeKineticsRanks";
import { mergeWithExistingLeaderboard_3 } from "./helpers/mergeWithExistingLeaderboard_2 copy";
import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { computeNewBatchKinetics_2 } from "./helpers/__deprecated__computeNewBatchKinetics_2";

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

	public async start(
		batch: ITaggedLeaderboardSnapshotsBatch_2,
		p0: { correlationId: string; previewOnly: boolean }
	): Promise<ILeaderboardTickerSnapshot_2[]> {
		const leaderboardTag: string = batch.scan_strategy_tag;
		const snapshots = batch.normalized_leaderboard_snapshots;

		// Ensure leaderboard store exists
		await this.initializeLeaderboardIfMissing(leaderboardTag);

		// Store new ticker snapshots in the leaderboard storage
		await this.bulkUpsert(leaderboardTag, snapshots);

		// Pre-processing: create map of new batch
		const newBatchMap = new Map(snapshots.map((s) => [s.ticker_symbol__ld_tick, s]));

		// Step 1: Compute kinetics on incoming batch
		const enrichedBatchMap = await computeNewBatchKinetics_2(newBatchMap, leaderboardTag, this.storage);

		// Step 2: Load and prune stale historical leaderboard snapshots
		const persistedLeaderboard = await this.storage.retrieveLeaderboard(leaderboardTag);
		const prunedLeaderboardTickers = pruneStaleLeaderboardTickers(persistedLeaderboard ?? []);
		const prunedLeaderboardMap = new Map(
			prunedLeaderboardTickers.map((ticker) => [ticker.ticker_symbol__ld_tick, ticker])
		);

		// Step 4: Merge current batch into stored leaderboard
		const mergedMap = mergeWithExistingLeaderboard_3(prunedLeaderboardMap, enrichedBatchMap);

		console.log(Array.from(mergedMap.values()).slice(0, 2));

		// Step 5: Compute sub-leaderboard rankings
		const snapsWithRankedKineticsMap = computeKineticsRanks(mergedMap);

		// Step 6: Compute aggregate rankings
		const snapsWithAggKineticsMap = computeAggregateRank(Array.from(snapsWithRankedKineticsMap.values()));

		// REMOVE -> IN THE WRONG PLACE -> TOO LATE IN THE CHAIN
		// Store new snapshots at the end, after all enrichments
		await this.appendHisoricalSnapshots([...snapsWithAggKineticsMap.values()], leaderboardTag);

		// Step 7: Sort and trim the leaderboard
		const finalLeaderboard = getFinalLeaderboardRank(Array.from(snapsWithAggKineticsMap.values()), this.sorter).slice(
			0,
			APP_CONFIG_2.leaderboard.maxLeaderboardSnapshotLength
		);

		// Step 8: Persist final leaderboard
		await this.storage.persistLeaderboard(leaderboardTag, finalLeaderboard);

		return finalLeaderboard;
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
	private async storeNewSnapshots(data: ITaggedLeaderboardSnapshotsBatch_2, leaderboardTag: string): Promise<void> {
		for (const snapshot of data.normalized_leaderboard_snapshots) {
			try {
				await this.storage.storeSnapshot(leaderboardTag, snapshot.ticker_symbol__ld_tick, snapshot);
			} catch (err) {
				console.error(`[LeaderboardService] Error storing snapshot for ${snapshot.ticker_symbol__ld_tick}:`, err);
			}
		}
	}

	// WIP
	private async bulkUpsert(leaderboardName: string, items: ILeaderboardTickerSnapshot_2[]): Promise<BulkUpsertReport> {
		const results = await Promise.allSettled(
			items.map((s) => this.storage.storeSnapshot(leaderboardName, s.ticker_symbol__ld_tick, s))
		);
		const failed: Array<{ key: string; error: unknown }> = [];
		let success = 0;
		for (let i = 0; i < results.length; i++) {
			const r = results[i];
			if (r.status === "fulfilled") success++;
			else failed.push({ key: items[i].ticker_symbol__ld_tick, error: r.reason });
		}
		return { success, failed };
	}

	/**
	 * Persists a new batch of leaderboard ticker snapshots to the storage backend.
	 *
	 * Each snapshot is stored under its corresponding ticker name, namespaced by the provided leaderboard tag.
	 * This enables retrieval of per-ticker snapshot history across multiple scans for further analytics (e.g., velocity/acceleration).
	 *
	 */

	private async appendHisoricalSnapshots(
		snapshots: ILeaderboardTickerSnapshot_2[],
		leaderboardTag: string
	): Promise<void> {
		for (const snapshot of snapshots) {
			try {
				await this.storage.storeSnapshot(leaderboardTag, snapshot.ticker_symbol__ld_tick, snapshot);
			} catch (err) {
				console.error(`[LeaderboardService] Error storing snapshot for ${snapshot.ticker_symbol__ld_tick}:`, err);
			}
		}
	}
}
