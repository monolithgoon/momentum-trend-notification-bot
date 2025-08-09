import { MarketScanPayload } from "src/types/events/MarketScanEventPayload.interface";
import { LeaderboardUpdateEvent } from "src/types/events/LeaderboardUpdateEvent.interface";
import { LeaderboardOrchestrator_3 } from "src/strategies/rank/LeaderboardOrchestrator_2 copy";
import { LeaderboardEngine } from "src/analytics/leaderboard/LeaderboardEngine";
import {
	FieldSortConfig,
	LeaderboardTickerSnapshotsSorter_2,
} from "@analytics/leaderboard/LeaderboardTickerSnapshotsSorter_2";
import { FileLeaderboardStorage } from "@analytics/leaderboard/FileLeaderboardStorage_2";
import { LeaderboardTickerTransformer_2 } from "@core/models/rest_api/transformers/LeaderboardTickerTransformer_2";
import { SortOrder } from "@core/enums/SortOrder.enum";
import { typedEventEmitter } from "@infrastructure/event_bus/TypedEventEmitter";
import { appEvents } from "@config/appEvents";
import logger from "@infrastructure/logger";
import { generateCorrelationId } from "@core/utils/correlation";
import timer from "@core/utils/timer";

async function handleMarketScanComplete(payload: MarketScanPayload) {
	const { snapshots, marketScanStrategyPresetKeys } = payload;
	const correlationId = generateCorrelationId("leaderboard-orchestrator");
	const stop = timer("leaderboard_update.duration_ms", { correlationId });

	// ================================
	// ⚙️ Build storage + sorter + engine
	// ================================
	const storage = new FileLeaderboardStorage();

	// Primary sorts by aggregate kinetics rank (lowest is best),
	// then tie-break by a couple of useful dimensions.
	const tieBreakers: FieldSortConfig[] = [
		// If you prefer .rankings fields, swap to those (e.g. "volume_rank")
		{ field: "change_pct__ld_tick", order: SortOrder.DESC },
		{ field: "volume__ld_tick", order: SortOrder.DESC },
	];

	const sorter = new LeaderboardTickerSnapshotsSorter_2(
		"aggregate_kinetics_rank", // primary field (configurable)
		SortOrder.ASC, // lower aggregate rank wins
		tieBreakers
	);

	// ================================
	// 🧠 Orchestrator
	// ================================
	const orchestrator = new LeaderboardOrchestrator_3({
		correlationId,
		snapshots: snapshots.slice(0, 5), // Limit to 2 for testing
		// snapshots, // Uncomment for full batch
		// Note: transformer is used to convert raw snapshots to leaderboard format
		snapshotTransformer: new LeaderboardTickerTransformer_2(),
		leaderboardEngine: new LeaderboardEngine(storage, sorter),
		leaderboardScanStrategyTag: marketScanStrategyPresetKeys,
		previewOnly: false,
		onStepComplete: (step) => logger.info({ step, correlationId }, "Leaderboard step complete"),
	});

	try {
		const result: LeaderboardUpdateEvent = await orchestrator.ingestSnapshotBatch();
		const leaderboardUpdateEvent: LeaderboardUpdateEvent = {
			leaderboardTag: result.leaderboardTag,
			topTicker: result.topTicker,
			total: result.total,
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

// Wire listener
export function registerLeaderboardListener_2() {
	typedEventEmitter.on(appEvents.MARKET_SCAN_COMPLETE, handleMarketScanComplete);
}
