import { getCurrentMarketSession } from "@core/utils";
import { generateCorrelationId } from "@core/utils/correlation";
import timer from "@core/utils/timer";
import logger from "@infrastructure/logger";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";
import { MarketScanOrchestrator_3 } from "src/strategies/scan_2/MarketScanOrchestrator_3";
import { AdvancedThresholdConfig } from "src/strategies/filter_2/filterByThresholds";
import { MarketScanStrategyPresetKey } from "src/strategies/scan_2/MarketScanStrategyPresetKey.enum";
import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { SortOrder } from "@core/enums/SortOrder.enum";
import { NormalizedSnapshotSorter } from "src/strategies/sort/NormalizedSnapshotSorter";
import { AssertNormalizedSortFieldsValid } from "@core/models/snapshotFieldTypeAssertions";

/**
 * Runs a live market scan using predefined filters and logs the results.
 */
export async function runLiveMarketScannerTask_3(): Promise<void> {
	// 1. Setup context
	const correlationId = generateCorrelationId("scan");
	const marketSession = getCurrentMarketSession();
	const stop = timer("scan.duration_ms", { correlationId });
	logger.info({ correlationId, marketSession }, "🟢 Starting market scan");
	console.log({ marketSession });

	try {
		// 2. Initialize orchestrator
		const orchestrator = new MarketScanOrchestrator_3({ marketSession, correlationId });

		// 3. Define scan filter config
		const fieldLimiters: AdvancedThresholdConfig<NormalizedRestTickerSnapshot> = {
			volume: { operation: ">", value: 1000000 },
			change_pct__nz_tick: { operation: ">=", value: 2.5 },
		};

		// 4. Run orchestrator
		const results = await orchestrator.executeScan({
			numericFieldLimiters: fieldLimiters,
			dedupField: "ticker_name__nz_tick",
			marketSession: getCurrentMarketSession(),
			sessionScanPresetKeys: [
				MarketScanStrategyPresetKey.MARKET_TOP_GAINERS,
				MarketScanStrategyPresetKey.MARKET_TOP_RECENT_IPO,
			],
			marketDataVendor: MarketDataVendor.POLYGON,
			fieldSorter: new NormalizedSnapshotSorter("change_pct__nz_tick", SortOrder.DESC),
		});

		// 5. Log sorted results
		logger.info(
			{
				correlationId,
				found: results.length,
				tickers: results.map((t) => t.ticker_name__nz_tick),
			},
			"✅ Market scan complete"
		);
	} catch (error) {
		logger.error({ correlationId, error }, "❌ Market scan failed");
	} finally {
		stop();
	}
}
