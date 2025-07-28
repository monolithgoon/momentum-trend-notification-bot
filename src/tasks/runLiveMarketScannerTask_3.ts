import { getCurrentMarketSession } from "@core/utils";
import { generateCorrelationId } from "@core/utils/correlation";
import timer from "@core/utils/timer";
import logger from "@infrastructure/logger";
import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";
import { MarketScanOrchestrator_3 } from "src/strategies/scan_2/MarketScanOrchestrator_3";
import { AdvancedThresholdConfig } from "src/strategies/filter/filterByThresholds";
import { ScanPresetKey } from "src/strategies/scan_2/ScanPresetKey.enum";
import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";

/**
 * Runs a live market scan using predefined filters and logs the results.
 */
export async function runLiveMarketScannerTask_3(): Promise<void> {
	// 1. Setup context
	const correlationId = generateCorrelationId("scan");
	const session = getCurrentMarketSession();
	const stop = timer("scan.duration_ms", { correlationId });
	logger.info({ correlationId, session }, "🟢 Starting market scan");

	try {
		// 2. Initialize orchestrator
		const orchestrator = new MarketScanOrchestrator_3({ session, correlationId });

		// 3. Define scan filter config
		// export type FieldThresholdConfig<T> = Partial<Record<keyof T, number>>;
		// const config: FieldThresholdConfig<NormalizedRestTickerSnapshot> = {
		// 	volume: 1_000_000,
		// 	change_pct__nz_tick: 2.5,
		// };
		const fieldLimiters: AdvancedThresholdConfig<NormalizedRestTickerSnapshot> = {
			volume: { operation: ">", value: 1000000 },
			change_pct__nz_tick: { operation: ">=", value: 2.5 },
		};

		// 4. Run orchestrator
		const results = await orchestrator.executeScan({
			numericFieldLimiters: fieldLimiters,
			dedupField: "ticker_name__nz_tick",
			marketSession: getCurrentMarketSession(), // ✅ fixed
			sessionScanPresetKeys: [ScanPresetKey.PREMARKET_TOP_MOVERS, ScanPresetKey.RECENT_IPO],
			marketDataVendor: MarketDataVendor.POLYGON,
		});

		// 5. Log results
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
