// src/analytics/leaderboard/LeaderboardEngine.ts

import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { ITaggedLeaderboardSnapshotsBatch_2 } from "./types/ITaggedLeaderboardSnapshotsBatch.interface_2";
import { ILeaderboardStorage, BulkUpsertReport } from "./types/ILeaderboardStorage.interface";
import { LeaderboardTickerSnapshotsSorter_2 } from "./LeaderboardTickerSnapshotsSorter_2";
import { APP_CONFIG_2 } from "src/config_2/app_config";
import { computeNewBatchKinetics_3 } from "./helpers/computeNewBatchKinetics_3";
import { pruneStaleLeaderboardTickers } from "./helpers/pruneOldTickers";
import { mergeWithExistingLeaderboard_3 } from "./helpers/mergeWithExistingLeaderboard_2 copy";
import { computeAggregateRank, computeKineticsRanks, getFinalLeaderboardRank } from "./helpers/computeKineticsRanks";

const BULK_CHUNK_SIZE = 250; // tune for your FS/DB characteristics

function uniq<T>(arr: T[]): T[] {
	return Array.from(new Set(arr));
}

/** tiny chunker to avoid a lodash dependency */
function chunk<T>(arr: T[], size: number): T[][] {
	if (size <= 0) return [arr];
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

export class LeaderboardEngine_2 {
	constructor(
		private readonly storage: ILeaderboardStorage,
		private readonly sorter: LeaderboardTickerSnapshotsSorter_2,
		private readonly logger: any
	) {}

	/**
	 * PHASE A: persist raw history (append/idempotent)
	 * PHASE B: compute from stored symbolsHistoryMap (includes just-written snapshot)
	 * PHASE C: persist derived leaderboard (unless previewOnly)
	 */
	public async start(
		batch: ITaggedLeaderboardSnapshotsBatch_2,
		opts: { correlationId: string; previewOnly?: boolean }
	): Promise<ILeaderboardTickerSnapshot_2[]> {
		const { correlationId } = opts;
		const previewOnly = !!opts.previewOnly;
		const tag = batch.scan_strategy_tag;
		const incomingSnapshots = batch.normalized_leaderboard_snapshots ?? [];

		await this.initializeLeaderboardIfMissing(tag);

		const currLeaderboard = (await this.storage.retrieveLeaderboard(tag)) ?? [];

		if (!incomingSnapshots.length) {
			// No new points: still return whatever is persisted (or empty)
			this.logger.info("[LeaderboardEngine] no incoming snapshots", {
				tag,
				correlationId,
				currLeaderboard: currLeaderboard.length,
			});
			return currLeaderboard;
		}

		// === PHASE A: append snapshot history first ===

		await this.persistNewSnapshots__ok(tag, incomingSnapshots, correlationId);

		// === PHASE B: compute (read snapshot history that now includes the current point) ===
		let symbolsHistoryMap;
		const symbols = incomingSnapshots.map((s) => s.ticker_symbol__ld_tick);
		const velWindow = APP_CONFIG_2?.leaderboard?.velWindow ?? 20;
		const accWindow = APP_CONFIG_2?.leaderboard?.accWindow ?? 20;
		const minRequiredPoints = Math.max(velWindow, accWindow) + 1;
		const DEFAULT_LOOKBACK = Math.max(velWindow, accWindow) * 6;
		const lookbackLimit = Math.max(
			minRequiredPoints,
			APP_CONFIG_2?.leaderboard?.maxSnapshotHistoryLookback ?? DEFAULT_LOOKBACK
		);

		if (!previewOnly) {
			await this.persistNewSnapshots__ok(tag, incomingSnapshots, correlationId);
			symbolsHistoryMap = await this.retreiveHistoryForSymbols__ok(tag, symbols, lookbackLimit);
		} else {
			symbolsHistoryMap = await this.retreiveHistoryForSymbols__ok(tag, symbols, lookbackLimit);
			// ensure your kinetics fn appends the current snapshot if the tail doesn’t include it
			// (your computeNewBatchKinetics already does this check)
		}

		// Step 1: Compute kinetics from snapshot history
		const enrichedSnapshotsMap = computeNewBatchKinetics_3(incomingSnapshots, symbolsHistoryMap, {
			velWindow,
			accWindow,
			// minRequiredPoints: optional override,
			appendCurrentIfMissing: true,
		});

		// Step 2: Load and prune stale historical leaderboard snapshots
		// const persistedLeaderboard = await this.storage.retrieveLeaderboard(leaderboardTag);
		const prunedLeaderboardTickers = pruneStaleLeaderboardTickers(currLeaderboard);
		const prunedLeaderboardMap = new Map(
			prunedLeaderboardTickers.map((ticker) => [ticker.ticker_symbol__ld_tick, ticker])
		);

		// Step 4: Merge current batch into stored leaderboard
		const mergedMap = mergeWithExistingLeaderboard_3(prunedLeaderboardMap, enrichedSnapshotsMap);

		console.log(Array.from(mergedMap.values()).slice(0, 2));

		// Step 5: Compute sub-leaderboard rankings
		const snapsWithRankedKineticsMap = computeKineticsRanks(mergedMap);

		// Step 6: Compute aggregate rankings
		const snapsWithAggKineticsMap = computeAggregateRank(Array.from(snapsWithRankedKineticsMap.values()));

		// Step 7: Sort and trim the leaderboard
		const maxLenCfg = APP_CONFIG_2?.leaderboard?.maxLeaderboardSnapshotLength;
		const maxLen = Number.isFinite(maxLenCfg) && maxLenCfg! > 0 ? maxLenCfg! : 500; // fallback
		const finalList = getFinalLeaderboardRank(Array.from(snapsWithAggKineticsMap.values()), this.sorter).slice(
			0,
			maxLen
		);

		// === PHASE C: persist derived leaderboard ===

		// Step 8: Persist final leaderboard
		if (!previewOnly) {
			await this.storage.persistLeaderboard(tag, finalList);
		}

		return finalList;
	}

	// ======================
	// Internals / helpers
	// ======================

	private async initializeLeaderboardIfMissing(tag: string): Promise<void> {
		await this.storage.initializeLeaderboardStore(tag);
	}

	// If you don't already have this type locally, add it:

	/**
	 * Persist new snapshots to the leaderboard storage.
	 * Returns a summary of success and any failures.
	 */

	private async persistNewSnapshots__ok(
		tag: string,
		items: ILeaderboardTickerSnapshot_2[],
		correlationId: string
	): Promise<BulkUpsertReport> {
		if (!items.length) return { success: 0, failed: [] };

		let success = 0;
		const failed: BulkUpsertReport["failed"] = [];

		for (const part of chunk(items, BULK_CHUNK_SIZE)) {
			const results = await Promise.allSettled(
				part.map((s) => this.storage.storeSnapshot(tag, s.ticker_symbol__ld_tick, s))
			);

			for (let i = 0; i < results.length; i++) {
				const r = results[i];
				if (r.status === "fulfilled") success++;
				else failed.push({ key: part[i].ticker_symbol__ld_tick, error: r.reason });
			}
		}

		if (failed.length) {
			this.logger.warn("[LeaderboardEngine] storeSnapshot partial failures", {
				tag,
				correlationId,
				attempted: items.length,
				success,
				failed: failed.length,
				chunks: Math.ceil(items.length / BULK_CHUNK_SIZE),
			});
		}

		return { success, failed };
	}

	private async retreiveHistoryForSymbols__ok(
		tag: string,
		symbols: string[],
		limit: number
	): Promise<Record<string, ILeaderboardTickerSnapshot_2[]>> {
		// Uses existing per-symbol API; replace with storage.readTailMany for efficiency when available.
		const uniq = Array.from(new Set(symbols));
		const out: Record<string, ILeaderboardTickerSnapshot_2[]> = {};
		await Promise.all(
			uniq.map(async (sym) => {
				out[sym] = await this.storage
					.readSnapshotHistoryForTicker(tag, sym, limit)
					.catch(() => [] as ILeaderboardTickerSnapshot_2[]);
			})
		);
		return out;
	}

	/** Combine multiple sub-ranks / signals into a single score & rank fields. */
	private aggregateAndRank(items: ILeaderboardTickerSnapshot_2[]): ILeaderboardTickerSnapshot_2[] {
		// TODO: your aggregate score + dense ranks. For now, pass-through.
		return items;
	}

	/** Remove items per policy (age/inactivity/etc.). */
	private prune(items: ILeaderboardTickerSnapshot_2[]): ILeaderboardTickerSnapshot_2[] {
		// TODO: apply your prune policy. For now, pass-through.
		return items;
	}

	/** Primary sort + tie-breakers for presentation. */
	private sort(items: ILeaderboardTickerSnapshot_2[]): ILeaderboardTickerSnapshot_2[] {
		// TODO: sort by your chosen fields. For now, stable identity.
		return items;
	}
}
