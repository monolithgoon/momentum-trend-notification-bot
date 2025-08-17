import logger from "@infrastructure/logger";
import { MarketScanPayload } from "src/types/events/MarketScanEventPayload.interface";
import { generateCorrelationId } from "@core/utils/correlation";
import timer from "@core/utils/timer";
import { LeaderboardOrchestrator_2 } from "@analytics/leaderboard/__deprecated__LeaderboardOrchestrator_2";
import { LeaderboardTickerTransformer } from "@core/models/rest_api/transformers/LeaderboardTickerTransformer";
import { LeaderboardService } from "@services/leaderboard/__deprecated__LeaderboardService";
import { scoringStrategies } from "@services/leaderboard/scoringStrategies";
import { FileLeaderboardStorage } from "@services/leaderboard/FileLeaderboardStorage";
import { LeaderboardTickerSnapshotsSorter } from "@services/leaderboard/__deprecated__LeaderboardTickerSnapshotsSorter";
import { SortOrder } from "@core/enums/SortOrder.enum";
import { typedEventEmitter } from "@infrastructure/event_bus/TypedEventEmitter";
import { LeaderboardUpdateEvent } from "src/types/events/LeaderboardUpdateEvent.interface";
import { appEvents } from "@config/appEvents";

async function handleMarketScanComplete(payload: MarketScanPayload) {
	const { snapshots, marketScanStrategyPresetKeys } = payload;
	const correlationId = generateCorrelationId("leaderboard-orchestrator");
	const stop = timer("leaderboard_update.duration_ms", { correlationId });

	const orchestrator = new LeaderboardOrchestrator_2({
		correlationId,
		snapshots,
		snapshotTransformer: new LeaderboardTickerTransformer(),
		leaderboardService: new LeaderboardService(new FileLeaderboardStorage(), scoringStrategies.popUpDecayMomentum),
		leaderboardScanStrategyTag: marketScanStrategyPresetKeys,
		leaderboardSortingFn: new LeaderboardTickerSnapshotsSorter("leaderboard_momentum_score", SortOrder.DESC),
		previewOnly: false,
		onStepComplete: (step) => logger.info({ step, correlationId }, "Leaderboard step complete"),
	});

	try {
		const result: LeaderboardUpdateEvent | undefined = await orchestrator.ingestSnapshotBatch();

		const leaderboardUpdateEvent: LeaderboardUpdateEvent = result
			? {

					leaderboardTag: result.leaderboardTag,
					total: result.total,
					topTicker: result.topTicker,
			  }
			: {
					leaderboardTag: "unknown",
					total: 0,
					topTicker: undefined,
			  };

		console.log({ leaderboardUpdateEvent });

		typedEventEmitter.emit(appEvents.LEADERBOARD_UPDATE, leaderboardUpdateEvent);
	} catch (err) {
		logger.error({ correlationId, err }, "❌ Leaderboard ingestion task failed");
	} finally {
		logger.info({ correlationId }, "Leaderboard ingestion task completed");
		stop();
	}
}

export function registerLeaderboardListener() {
	typedEventEmitter.on(appEvents.MARKET_SCAN_COMPLETE, handleMarketScanComplete);
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
