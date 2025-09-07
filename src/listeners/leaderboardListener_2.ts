import { appEvents } from "@config/appEvents";
import { typedEventEmitter } from "@infrastructure/event_bus/TypedEventEmitter";
import logger, { logger_2 } from "@infrastructure/logger";

import { MarketScanPayload } from "src/types/events/MarketScanEventPayload.interface";
import { LeaderboardUpdateEvent } from "src/types/events/LeaderboardUpdateEvent.interface";

import { generateCorrelationId } from "@core/utils/correlation";
import timer from "@core/utils/timer";
import { SortOrder } from "@core/enums/SortOrder.enum";

import { FileLeaderboardStorage } from "@analytics/leaderboard/FileLeaderboardStorage_2";
import { LeaderboardEngine_3 } from "@analytics/leaderboard/LeaderboardEngine_3";
import { LeaderboardOrchestrator_3 } from "@analytics/leaderboard/LeaderboardOrchestrator_3";
import {
	FieldSortConfig,
	LeaderboardTickerSnapshotsSorter_2,
} from "@analytics/leaderboard/LeaderboardTickerSnapshotsSorter_2";
import { LeaderboardTickerTransformer_3 } from "@core/models/rest_api/transformers/LeaderboardTickerTransformer_2 copy";

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
		// TODO -> add first_time_seen_flag field here
		{ field: "pct_change__ld_tick", order: SortOrder.DESC },
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
		snapshots: snapshots.slice(0, 10), // Limit to 2 for testing
		// snapshots, // Uncomment for full batch
		snapshotTransformer: new LeaderboardTickerTransformer_3(),
		// leaderboardEngine: new LeaderboardEngine(storage, sorter),
		leaderboardEngine: new LeaderboardEngine_3(storage, sorter, logger_2),
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
