import { SortedNormalizedTickerSnapshot } from "@core/models/rest_api/SortedNormalizedTickerSnapshot.interface";
import { LeaderboardTickersSorter } from "@services/leaderboard/LeaderboardTickersSorter";
import { LeaderboardService } from "@services/leaderboard/LeaderboardService";
import { LeaderboardStorage } from "@services/leaderboard/LeaderboardStorage.interface";
import { LeaderboardSnapshotsMap } from "@core/models/rest_api/LeaderboardSnapshotsMap.interface";
import { LeaderboardTickerTransformer } from "@core/models/rest_api/transformers/LeaderboardTickerTransformer";
import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/LeaderboardRestTickerSnapshot.interface";

interface LeaderboardOrchestratorOptions {
	correlationId: string;
	snapshots: SortedNormalizedTickerSnapshot[];
  snapshotTransformer: LeaderboardTickerTransformer;
	leaderboardScanStrategyTag: string[];
	leaderboardSortingFn: LeaderboardTickersSorter;
	leaderboardService: LeaderboardService;
	leaderboardStorage: LeaderboardStorage;
	onStepComplete?: (step: string, payload?: any) => void;
	preprocessFn?: (snapshots: SortedNormalizedTickerSnapshot[]) => SortedNormalizedTickerSnapshot[];
	previewOnly?: boolean;
}

interface LeaderboardOpResult {
	tag: string;
	total: number;
	topTicker?: string;
	preview?: SortedNormalizedTickerSnapshot[];
}

export class LeaderboardOrchestrator {
	constructor(private readonly orchestratorOptions: LeaderboardOrchestratorOptions) {}

	public async ingestSnapshotBatch(): Promise<LeaderboardOpResult> {
		const {
			correlationId,
			snapshots,
      snapshotTransformer,
			leaderboardService,
			leaderboardScanStrategyTag,
			leaderboardSortingFn,
			leaderboardStorage,
			onStepComplete,
			preprocessFn,
			previewOnly = false,
		} = this.orchestratorOptions;

		// 1. Apply optional preprocessing
		const incomingSnapshots: SortedNormalizedTickerSnapshot[] = preprocessFn ? preprocessFn(snapshots) : snapshots;
		onStepComplete?.("preprocess", incomingSnapshots);

		// 2. Transform to leaderboard snapshots, compose tag & tag snapshots
		const leaderboardTag = composeScanStrategyTag(leaderboardScanStrategyTag);
		const leaderboardTickers = incomingSnapshots.map((snapshot) => snapshotTransformer.transform(snapshot));
		const snapshotsMap = tagSnapshotsWithStrategyMeta(leaderboardTickers, leaderboardTag);
		onStepComplete?.("tagging", snapshotsMap);

		// 3. If preview mode, return ranked preview without persisting
		if (previewOnly) {
			onStepComplete?.("preview", incomingSnapshots);
			return {
				tag: leaderboardTag,
				total: incomingSnapshots.length,
				topTicker: incomingSnapshots[0]?.ticker_symbol__nz_tick,
				preview: incomingSnapshots,
			};
		}

		// 4. Initialize leaderboard storage
		await leaderboardStorage.initializeLeaderboardStore(leaderboardTag);
		onStepComplete?.("storage_initialized", leaderboardTag);

    // 5. Process latest snapshots
		await leaderboardService.rankAndUpdateLeaderboard(snapshotsMap, leaderboardSortingFn);
		onStepComplete?.("leaderboard_updated", leaderboardTag);

		console.log({ currentLeaderboard: leaderboardStorage });

		return {
			tag: leaderboardTag,
			total: Object.keys(snapshotsMap).length,
			topTicker: Object.values(snapshotsMap)[0]?.ticker_name__ld_tick,
		};
	}

  // FIXME -> THIS SEEMS REDUNDANT -> maybe split up the setupLeaderboardMtd() further?
	public preview(): Promise<LeaderboardOpResult> {
		return this.ingestSnapshotBatch();
	}
}

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