import logger from "@infrastructure/logger";
import { MarketScanPayload } from "src/strategies/scan_2/MarketScanPayload.interface";
import { generateCorrelationId } from "@core/utils/correlation";
import timer from "@core/utils/timer";
import { LeaderboardOrchestrator_2 } from "src/strategies/rank/LeaderboardOrchestrator_2";
import { LeaderboardTickerTransformer } from "@core/models/rest_api/transformers/LeaderboardTickerTransformer";
import { LeaderboardService } from "@services/leaderboard/LeaderboardService";
import { scoringStrategies } from "@services/leaderboard/scoringStrategies";
import { FileLeaderboardStorage } from "@services/leaderboard/FileLeaderboardStorage";
import { LeaderboardTickersSorter } from "@services/leaderboard/LeaderboardTickersSorter";
import { SortOrder } from "@core/enums/SortOrder.enum";
import { EVENTS } from "@config/constants";
import { typedEventEmitter } from "@infrastructure/event_bus/TypedEventEmitter";
import { LeaderboardUpdateEvent } from "src/types/LeaderboardUpdateEvent.interface";

async function handleMarketScanComplete(payload: MarketScanPayload) {
	const { snapshots, marketScanStrategyPresetKeys } = payload;
	const correlationId = generateCorrelationId("leaderboard-orchestrator");
	const stop = timer("leaderboard_update.duration_ms", { correlationId });

	const orchestrator = new LeaderboardOrchestrator_2({
		correlationId,
		snapshots,
		snapshotTransformer: new LeaderboardTickerTransformer(),
		leaderboardService: new LeaderboardService(
			new FileLeaderboardStorage(),
			scoringStrategies.popUpDecayMomentum
		),
		leaderboardScanStrategyTag: marketScanStrategyPresetKeys,
		leaderboardSortingFn: new LeaderboardTickersSorter("leaderboard_momentum_score", SortOrder.DESC),
		previewOnly: false,
		onStepComplete: (step) => logger.info({ step, correlationId }, "Leaderboard step complete"),
	});

	try {
		const result: LeaderboardUpdateEvent | undefined = await orchestrator.ingestSnapshotBatch();

		const leaderboardUpdateEvent: LeaderboardUpdateEvent = result
			? {
					tag: result.tag,
					total: result.total,
					topTicker: result.topTicker,
				}
			: {
					tag: "unknown",
					total: 0,
					topTicker: undefined,
				};

		typedEventEmitter.emit(EVENTS.LEADERBOARD_UPDATE, leaderboardUpdateEvent);
	} catch (err) {
		logger.error({ correlationId, err }, "❌ Leaderboard ingestion task failed");
	} finally {
		logger.info({ correlationId }, "Leaderboard ingestion task completed");
		stop();
	}
}

export function registerLeaderboardListener() {
	typedEventEmitter.on(EVENTS.MARKET_SCAN_COMPLETE, handleMarketScanComplete);
}

// await orchestrator
// 	.ingestSnapshotBatch()
// 	.then((res) => {
// 		result = res;
// 	})
// 	.catch((err) => {
// 		logger.error({ correlationId, err }, "❌ Leaderboard ingestion task failed");
// 	})
// 	.finally(() => logger.info({ correlationId }, "Leaderboard ingestion task completed"))
// 	// Ensure we always stop the timer
// 	.finally(stop);
