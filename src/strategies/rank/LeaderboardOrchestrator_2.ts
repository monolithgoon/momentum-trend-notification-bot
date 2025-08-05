import { SortedNormalizedTickerSnapshot } from "@core/models/rest_api/SortedNormalizedTickerSnapshot.interface";
import { LeaderboardTickersSorter } from "@services/leaderboard/LeaderboardTickersSorter";
import { LeaderboardService } from "@services/leaderboard/LeaderboardService";
import { LeaderboardSnapshotsMap } from "@core/models/rest_api/LeaderboardSnapshotsMap.interface";
import { LeaderboardTickerTransformer } from "@core/models/rest_api/transformers/LeaderboardTickerTransformer";
import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/LeaderboardRestTickerSnapshot.interface";
import { LeaderboardUpdateEvent } from "src/types/events/LeaderboardUpdateEvent.interface";

interface LeaderboardOrchestratorOptions {
	correlationId: string;
	snapshots: SortedNormalizedTickerSnapshot[];
	snapshotTransformer: LeaderboardTickerTransformer;
	leaderboardScanStrategyTag: string[];
	leaderboardSortingFn: LeaderboardTickersSorter;
	leaderboardService: LeaderboardService;
	onStepComplete?: (step: string, payload?: any) => void;
	preprocessFn?: (snapshots: SortedNormalizedTickerSnapshot[]) => SortedNormalizedTickerSnapshot[];
	previewOnly?: boolean;
	previewSliceLimit?: number; // 🆕 Optional limit for preview mode
}

export class LeaderboardOrchestrator_2 {
	constructor(private readonly orchestratorOptions: LeaderboardOrchestratorOptions) {}

	public async ingestSnapshotBatch(): Promise<LeaderboardUpdateEvent> {
		const incomingSnapshots = this._preProcessSnapshots();
		const leaderboardTag = this._composeTag();
		const snapshotsMap = this._getSnapshotsMap(incomingSnapshots, leaderboardTag);

		// Start the scoring & ranking pipeline
		await this._runService(snapshotsMap);

		return {
			tag: leaderboardTag,
			total: Object.keys(snapshotsMap).length,
			topTicker: Object.values(snapshotsMap)[0]?.ticker_name__ld_tick,
		};
	}

	/**
	 * Public method to preview leaderboard data without persisting it.
	 * Transforms + ranks + slices the data.
	 */
	public async preview(): Promise<LeaderboardUpdateEvent> {
		const incomingSnapshots = this._preProcessSnapshots();
		const leaderboardTag = this._composeTag();
		const leaderboardSnapshots = this._transformSnapshots(incomingSnapshots);

		// Rank the tickers (non-mutating sort)
		// const ranked = [...leaderboardTickers].sort(this.orchestratorOptions.leaderboardSortingFn);

		// 🔢 Slice top N results for preview — configurable
		const limit = this.orchestratorOptions.previewSliceLimit ?? 10;
		const previewTop = leaderboardSnapshots.slice(0, limit);

		this.orchestratorOptions.onStepComplete?.("LEADERBOARD_PREVIEW", previewTop);

		return {
			tag: leaderboardTag,
			total: previewTop.length,
			topTicker: previewTop[0]?.ticker_name__ld_tick,
			preview: previewTop,
		};
	}

	// ——— Private methods ———

	private _preProcessSnapshots(): SortedNormalizedTickerSnapshot[] {
		const { snapshots, preprocessFn, onStepComplete } = this.orchestratorOptions;
		const processed = preprocessFn ? preprocessFn(snapshots) : snapshots;
		onStepComplete?.("LEADERBOARD_PREPROCESS", processed);
		return processed;
	}

	private _composeTag(): string {
		const { leaderboardScanStrategyTag } = this.orchestratorOptions;
		return composeScanStrategyTag(leaderboardScanStrategyTag);
	}

	private _transformSnapshots(incomingSnapshots: SortedNormalizedTickerSnapshot[]): LeaderboardRestTickerSnapshot[] {
		const { snapshotTransformer } = this.orchestratorOptions;
		return incomingSnapshots.map((snapshot) => snapshotTransformer.transform(snapshot));
	}

	private _getSnapshotsMap(incomingSnapshots: SortedNormalizedTickerSnapshot[], tag: string): LeaderboardSnapshotsMap {
		const transformed = this._transformSnapshots(incomingSnapshots);
		const map = tagSnapshotsWithStrategyMeta(transformed, tag);
		this.orchestratorOptions.onStepComplete?.("LEADERBOARD_METADATA_TAGGING", map);
		return map;
	}

	private async _runService(snapshotsMap: LeaderboardSnapshotsMap): Promise<void> {
		const { leaderboardService, leaderboardSortingFn, onStepComplete } = this.orchestratorOptions;
		await leaderboardService.rankAndUpdateLeaderboard(snapshotsMap, leaderboardSortingFn);
		onStepComplete?.("LEADERBOARD_UPDATED", snapshotsMap.scan_strategy_tag);
	}
}

// ——— helper functions (untouched) ———

function composeScanStrategyTag(scanStrategyKeys: string[]): string {
	return Array.isArray(scanStrategyKeys) ? scanStrategyKeys.join("_") : String(scanStrategyKeys);
}

/**
 * Adds a tag to the market scan result.
 */
function tagSnapshotsWithStrategyMeta(
	tickers: LeaderboardRestTickerSnapshot[],
	scan_strategy_tag: string
): LeaderboardSnapshotsMap {
	return {
		scan_strategy_tag,
		normalized_leaderboard_tickers: tickers.map((ticker) => ({
			...ticker,
		})),
	};
}
