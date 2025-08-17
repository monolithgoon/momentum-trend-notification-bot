import logger from "@infrastructure/logger";
import timer from "@core/utils/timer";
import { typedEventEmitter } from "@infrastructure/event_bus/TypedEventEmitter";

import { getCurrentMarketSession } from "@core/utils";
import { generateCorrelationId } from "@core/utils/correlation";
import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { SortOrder } from "@core/enums/SortOrder.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";

import { MarketScanOrchestrator_3 } from "src/strategies/scan_2/MarketScanOrchestrator_3";
import { MarketScanStrategyPresetKey } from "src/strategies/scan_2/MarketScanStrategyPresetKey.enum";
import { MarketScanPayload } from "src/types/events/MarketScanEventPayload.interface";
import { AdvancedThresholdConfig } from "src/strategies/filter_2/filterByThresholds";
import { NormalizedSnapshotSorter } from "src/strategies/sort/NormalizedSnapshotSorter";
import { getSnapshotTickerNames } from "../core/utils/getSnapshotTickerNames";
import { appEvents } from "@config/appEvents";

/**
 * Runs a live market scan using predefined filters and logs the results.
 */
export async function runLiveMarketScannerTask_3() {
	// 1. Setup context
	const correlationId = generateCorrelationId("market-scan");
	const marketSession = getCurrentMarketSession();
	const stop = timer("scan.duration_ms", { correlationId });
	logger.info({ correlationId, marketSession }, "🟢 Starting market scan");
	console.log({ marketSession });

	try {
		// 2. Initialize marketScanOrchestrator
		const marketScanOrchestrator = new MarketScanOrchestrator_3({ marketSession, correlationId });
		const marketScanStrategyPresetKeys: MarketScanStrategyPresetKey[] = [
			MarketScanStrategyPresetKey.MARKET_TOP_GAINERS,
			// MarketScanStrategyPresetKey.MARKET_TOP_RECENT_IPO,
		];

		// 3. Define scan filter config
		const fieldLimiters: AdvancedThresholdConfig<NormalizedRestTickerSnapshot> = {
			// volume__nz_tick: { operation: ">", value: 1_000_000 },
			// change_pct__nz_tick: { operation: ">=", value: 2.5 },
			volume__nz_tick: { operation: ">", value: 50_000 },
			change_pct__nz_tick: { operation: ">=", value: 0 },
		};

		// 4. Run orchestrator
		const snapshots = await marketScanOrchestrator.executeScan({
			numericFieldLimiters: fieldLimiters,
			dedupField: "ticker_symbol__nz_tick",
			marketSession: getCurrentMarketSession(),
			marketScanStrategyPresetKeys,
			// marketDataVendor: MarketDataVendor.POLYGON,
			marketDataVendor: MarketDataVendor.FMP,
			fieldSorter: new NormalizedSnapshotSorter("change_pct__nz_tick", SortOrder.DESC),
		});

		const marketScanPayload: MarketScanPayload = {
			snapshots,
			tickerNames: getSnapshotTickerNames(snapshots, "ticker_symbol__nz_tick"),
			marketScanStrategyPresetKeys,
			correlationId,
			timestampMs: Date.now(),
			marketSession,
		};

		// 5. Log sorted snapshots
		logger.info(
			{
				correlationId,
				found: snapshots.length,
				tickers: marketScanPayload.tickerNames,
			},
			"✅ Market scan complete"
		);

		// 6. ✅ Trigger event listeners (leaderboard, ws, etc)
		typedEventEmitter.emit(appEvents.MARKET_SCAN_COMPLETE, marketScanPayload);
	} catch (error) {
		logger.error({ correlationId, error }, "❌ Market scan failed");
		return [];
	} finally {
		stop();
	}
}