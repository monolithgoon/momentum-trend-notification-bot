import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { ITaggedLeaderboardSnapshotsBatch_2 } from "./types/ITaggedLeaderboardSnapshotsBatch.interface_2";
import { ILeaderboardStorage, BulkUpsertReport } from "./types/ILeaderboardStorage.interface";
import { LeaderboardTickerSnapshotsSorter_2 } from "./LeaderboardTickerSnapshotsSorter_2";
import { APP_CONFIG_2 } from "src/config_2/app_config";
import { computeNewBatchKinetics_4 } from "@analytics/leaderboard_latest/computeNewBatchKinetics_4";
import { pruneStaleLeaderboardTickers } from "./helpers/pruneOldTickers";
import { mergeWithExistingLeaderboard_3 } from "./helpers/mergeWithExistingLeaderboard_2 copy";
import { computeAggregateRank, computeKineticsRanks, getFinalLeaderboardRank } from "./helpers/computeKineticsRanks";
import { Logger } from "@infrastructure/logger";
import { kineticsComputePlanSpec } from "@analytics/leaderboard_latest/kinetics";

const BULK_CHUNK_SIZE = 250; // Tune for your FS/DB characteristics

function uniq<T>(arr: T[]): T[] {
	return Array.from(new Set(arr));
}

/** Tiny chunker to avoid a lodash dep */
function chunk<T>(arr: T[], size: number): T[][] {
	if (size <= 0) return [arr];
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

/**
 * Orchestrates the full leaderboard update lifecycle in three phases:
 *   A) Persist raw history (append/idempotent, skipped in preview mode)
 *   B) Compute kinetics from stored tails (history now includes current points)
 *   C) Merge → prune → rank → sort → trim → persist final leaderboard (skip persist in preview)
 *
 * Notes:
 * - This engine assumes single-writer semantics per `tag`. If concurrent writers are possible,
 *   consider a per-tag mutex (see comment in `start()`).
 * - Storage only exposes `storeSnapshot`, so batch writes are chunked with Promise.allSettled.
 * - We derive kinetics windowing once in the engine and pass into the compute helper to avoid
 *   duplicating configuration logic in multiple places.
 */

export class LeaderboardEngine_3 {
	constructor(
		private readonly storage: ILeaderboardStorage,
		private readonly sorter: LeaderboardTickerSnapshotsSorter_2,
		private readonly logger: Logger
	) {}

	/**
	 * Entry point used by the orchestrator/listener.
	 *
	 * PHASE A: persist raw history (append/idempotent)
	 * PHASE B: compute from stored symbolsHistoryMap (includes just-written snapshot)
	 * PHASE C: persist derived leaderboard (unless previewOnlyChk)
	 *
	 * @param batch Normalized snapshots + scan tag (leaderboard namespace).
	 * @param opts  correlationId (for tracing), previewOnlyChk (skip writes).
	 */
	public async start(
		batch: ITaggedLeaderboardSnapshotsBatch_2,
		opts: { correlationId: string; previewOnly?: boolean }
	): Promise<ILeaderboardTickerSnapshot_2[]> {
		const { correlationId, previewOnly } = opts;
		const previewOnlyChk = !!previewOnly;
		const tag = batch.scan_strategy_tag;
		const incomingSnapshots = batch.normalized_leaderboard_snapshots ?? [];

		// TODO ->
		// If you expect parallel writers per `tag`, consider guarding this whole
		// method body with a keyed mutex (per-tag lock) to avoid read/modify/write races.

		// Ensure store folders/files exist before any IO
		await this.initializeLeaderboardIfMissing(tag);

		// Read current leaderboard once (used for no-input early return & merge base)
		const currLeaderboard = (await this.storage.retrieveLeaderboard(tag)) ?? [];

		if (!incomingSnapshots.length) {
			// Nothing to ingest; return what we already have.
			this.logger.info(
				{
					tag,
					correlationId,
					currLeaderboard: currLeaderboard.length,
				},
				"[LeaderboardEngine] no incoming snapshots"
			);
			return currLeaderboard;
		}

		/**	Derive kinetics windowing  (single source of truth) */

		const velWindowSamples = APP_CONFIG_2?.leaderboard?.velWindow ?? 20;
		const accWindowSamples = APP_CONFIG_2?.leaderboard?.accWindow ?? 20;
		const longestWindowSamples = Math.max(velWindowSamples, accWindowSamples);

		// How many windows of history to fetch for context (e.g., 6 × window)
		// The context window multiplier determines how much historical data to fetch for analysis. If the store contains fewer samples than requested, all available data will be used.
		// The “×6” context is just a fetch target. If the store only has 25, you’ll use 25 until more history accumulates.
		const contextWindowMultiplier = APP_CONFIG_2?.leaderboard?.historyContextWindowsMultiplier ?? 6;

		// Minimum samples to compute acceleration (needs one more than the largest window)
		const minSamplesForAccel = longestWindowSamples + 1;

		// Default history to fetch if none configured
		const defaultLookbackSamples = longestWindowSamples * contextWindowMultiplier;

		// Final lookback: never less than needed for acceleration
		const lookbackSamplesLimit = Math.max(
			minSamplesForAccel,
			APP_CONFIG_2?.leaderboard?.maxSnapshotHistoryLookback ?? defaultLookbackSamples
		);

		// === PHASE A: Append raw snapshots to history (skip in preview mode) ===

		// This guarantees snapshot histories read in PHASE B include the current snapshot(s).
		if (!previewOnlyChk) {
			await this.persistNewSnapshots(tag, incomingSnapshots, correlationId);
		}

		/*
			PHASE B: Compute kinetics from stored snapshots (now include the current point),
			with a defensive fallback: the compute helper will append the current bar
			if the store’s tail is behind (e.g., preview mode or eventual consistency).
		*/

		// De-duplicate ticker symbols
		const tickerSymbols = uniq(incomingSnapshots.map((s) => s.ticker_symbol__ld_tick));

		// Read bounded lookback histories for the current batch of ticker symbols
		const symbolHistoriesMap = await this.retrieveHistoryForSymbols(tag, tickerSymbols, lookbackSamplesLimit);

		// REMOVE - DEPRECATED
		// const enrichedSnapshotsMap = computeNewBatchKinetics_3(incomingSnapshots, symbolHistoriesMap, {
		// 	velWindow: velWindowSamples,
		// 	accWindow: accWindowSamples,
		// 	// Optional override: minRequiredPoints
		// 	appendCurrentIfMissing: true,
		// });

		// Latest (newest) kinetics pipeline
		const enrichedSnapshotsMap = computeNewBatchKinetics_4(
			incomingSnapshots, // ILeaderboardTickerSnapshot_2[]
			symbolHistoriesMap, // Record<string, ILeaderboardTickerSnapshot_2[]>
			kineticsComputePlanSpec
		);

		// Prune stale leaderboard snapshots
		const prunedLeaderboardTickers = pruneStaleLeaderboardTickers(currLeaderboard);
		const prunedLeaderboardMap = new Map(prunedLeaderboardTickers.map((t) => [t.ticker_symbol__ld_tick, t]));

		// Merge current batch into pruned leaderboard
		const mergedMap = mergeWithExistingLeaderboard_3(prunedLeaderboardMap, enrichedSnapshotsMap);

		// Compute sub-rankings
		const snapsWithRankedKineticsMap = computeKineticsRanks(mergedMap);

		// Compute aggregate sub-rankings → final sort & trim
		const snapsWithAggKinetics = computeAggregateRank([...snapsWithRankedKineticsMap.values()]);

		// Step 7: Sort and trim the leaderboard
		const maxLenCfg = APP_CONFIG_2?.leaderboard?.maxLeaderboardSnapshotLength;
		const maxLen = Number.isFinite(maxLenCfg) && (maxLenCfg as number) > 0 ? (maxLenCfg as number) : 500; // fallback
		const finalList = getFinalLeaderboardRank([...snapsWithAggKinetics.values()], this.sorter).slice(0, maxLen);

		// === PHASE C: Persist final leaderboard (skip in preview) ===

		if (!previewOnlyChk) {
			await this.storage.persistLeaderboard(tag, finalList);
		}

		// Log the symbol names and their final leaderboard_rank
		console.log(
			finalList.map((s) => ({
				symbol: s.ticker_symbol__ld_tick,
				leaderboard_rank: s.leaderboard_rank,
			})),
			"[LeaderboardEngine] Final leaderboard ranks"
		);

		return finalList;
	}

	// ────────────────────────────────────────────────────────────────────────────
	// Internals / helpers
	// ────────────────────────────────────────────────────────────────────────────

	/** Ensure the on-disk/on-db structure for a leaderboard tag exists. */
	private async initializeLeaderboardIfMissing(tag: string): Promise<void> {
		await this.storage.initializeLeaderboardStore(tag);
	}

	/**
	 * Persist new snapshots in chunks via `storeSnapshot` only (storage has no bulk API).
	 * Returns a compact success/failure report; logs a single warning if any failures occurred.
	 */
	private async persistNewSnapshots(
		tag: string,
		items: ILeaderboardTickerSnapshot_2[],
		correlationId: string
	): Promise<BulkUpsertReport> {
		if (!items.length) return { success: 0, failed: [] };

		let success = 0;
		const failed: BulkUpsertReport["failed"] = [];

		for (const part of chunk(items, BULK_CHUNK_SIZE)) {
			const results = await Promise.allSettled(
				part.map((s) => {
					// Only store the required fields
					const minimalSnapshot = {
						ticker_symbol__ld_tick: s.ticker_symbol__ld_tick,
						timestamp__ld_tick: s.timestamp__ld_tick,
						pct_change__ld_tick: s.pct_change__ld_tick,
						volume__ld_tick: s.volume__ld_tick,
					};
					return this.storage.storeSnapshot(tag, s.ticker_symbol__ld_tick, minimalSnapshot);
				})
			);

			for (let i = 0; i < results.length; i++) {
				const r = results[i];
				if (r.status === "fulfilled") success++;
				else failed.push({ key: part[i].ticker_symbol__ld_tick, error: r.reason });
			}
		}

		if (failed.length) {
			this.logger.warn(
				{
					tag,
					correlationId,
					attempted: items.length,
					success,
					failed: failed.length,
					chunks: Math.ceil(items.length / BULK_CHUNK_SIZE),
				},
				"[LeaderboardEngine] storeSnapshot partial failures"
			);
		}

		return { success, failed };
	}

	/**
	 * Read bounded lookback histories for a set of tickerSymbols in parallel.
	 * If storage introduces `readTailMany`, swap it in here for fewer syscalls.
	 */
	private async retrieveHistoryForSymbols(
		tag: string,
		tickerSymbols: string[],
		limit: number
	): Promise<Record<string, ILeaderboardTickerSnapshot_2[]>> {
		const unique = uniq(tickerSymbols);
		const out: Record<string, ILeaderboardTickerSnapshot_2[]> = {};
		await Promise.all(
			unique.map(async (sym) => {
				out[sym] = await this.storage
					.readSnapshotHistoryForTicker(tag, sym, limit)
					.catch(() => [] as ILeaderboardTickerSnapshot_2[]);
			})
		);
		return out;
	}
}
