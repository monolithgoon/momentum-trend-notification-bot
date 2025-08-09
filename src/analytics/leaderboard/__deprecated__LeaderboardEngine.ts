import { LeaderboardStorage } from "@services/leaderboard/LeaderboardStorage.interface";
import { computeKineticsRanks } from "./helpers/computeKineticsRanks";
import { addAppearancesField } from "./helpers/__deprecated__addAppearancesField";
import { pruneStaleLeaderboardTickers } from "./helpers/pruneStaleLeaderboardTickers";
import { updatePresenceCounters } from "./helpers/updatePresenceCounters";
import { RankedLeaderboardTicker } from "./types/__deprecated__RankedLeaderboardTicker.interface";
import { GenericTickerSorter } from "@core/generics/GenericTickerSorter.interface";
import { ITaggedLeaderboardSnapshotsBatch } from "@core/models/rest_api/ITaggedLeaderboardSnapshotsBatch.interface";
import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/LeaderboardRestTickerSnapshot.interface";

export class LeaderboardEngine {
	constructor(
		private readonly storage: LeaderboardStorage,
		private readonly sorter: GenericTickerSorter<RankedLeaderboardTicker, RankedLeaderboardTicker>
	) {}

	// async generateLeaderboard(data:ITaggedLeaderboardSnapshotsBatch, leaderboardTag: string): Promise<RankedLeaderboardTicker[]> {
	async rankAndUpdateLeaderboard(
		data: ITaggedLeaderboardSnapshotsBatch,
		sorter: GenericTickerSorter<RankedLeaderboardTicker, RankedLeaderboardTicker>
	): Promise<RankedLeaderboardTicker[]> {
		
		const leaderboardTag = data.scan_strategy_tag;
		const snapshots = data.normalized_leaderboard_tickers;

		addAppearancesField(snapshots);
		await this.initializeLeaderboardIfMissing(leaderboardTag);
		await this.storeNewSnapshots(data, leaderboardTag); // store the new snapshots to the storage interface (file, in-memory, redis, etc)

		const kineticsAdded = await this.computeNewBatchKinetics(data, leaderboardTag, this.storage); // process each snapshot in the batch
		const withRankedKinetics = computeKineticsRanks(kineticsAdded);
		
    const prevLeaderboard = await this.storage.retrieveLeaderboard(leaderboardTag);
    const pruned = pruneStaleLeaderboardTickers(prevLeaderboard);
    const historicalMap = new Map(pruned.map((t: RankedLeaderboardTicker) => [t.symbol__ld_tick, t]));

    updatePresenceCounters(historicalMap, withRankedKinetics);
		mergeWithExistingLeaderboard(historicalMap, withRankedKinetics);

    for (const [symbol, ticker] of withRankedKinetics.entries()) {
      historicalMap.set(symbol, ticker);
    }

    const merged = Array.from(historicalMap.values());

    const sorted = this.sorter.sort(merged).slice(0, 50);

    await this.storage.persistLeaderboard(leaderboardTag, sorted);
    return sorted;
	}
}
