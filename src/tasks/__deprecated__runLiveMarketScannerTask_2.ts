import { getCurrentMarketSession } from "@core/utils";
import { generateCorrelationId } from "@core/utils/correlation";
import timer from "@core/utils/timer";
import logger from "@infrastructure/logger";
import { ComposableDatasetFieldThresholdFilter } from "src/strategies/__deprecated__filter/ComposableDatasetFieldThresholdFilter";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";
import { MarketScanOrchestrator_2 } from "src/strategies/__deprecated__scan/MarketScanOrchestrator_2";
import { CompositeFilterScreener } from "src/strategies/__deprecated__filter/CompositeFilterScreener";
import { GenericDatasetFilter } from "src/strategies/__deprecated__filter/GenericDatasetFilter.interface";
import { DatasetScreenerConfig } from "src/strategies/__deprecated__scan/MarketScanOrchestrator_2";

/**
 * Runs a live market scan using predefined filters and logs the results.
 */
export async function runLiveMarketScannerTask_2(): Promise<void> {
	// 1. Setup context
	const correlationId = generateCorrelationId("scan");
	const session = getCurrentMarketSession();
	const stop = timer("scan.duration_ms", { correlationId });
	logger.info({ correlationId, session }, "🟢 Starting market scan");

	try {
		// 2. Initialize orchestrator
		const orchestrator = new MarketScanOrchestrator_2({ session, correlationId });

		// 3. Define scan filter config
		const numericFieldFilters: DatasetScreenerConfig<
			Partial<Record<keyof NormalizedRestTickerSnapshot, number>>
		>[] = [
			{
				dataFilter: new ComposableDatasetFieldThresholdFilter<
					NormalizedRestTickerSnapshot,
					Record<keyof NormalizedRestTickerSnapshot, number>
				>(),
				config: {
					volume__nz_tick: 1000000,
					change_pct__nz_tick: 2.5,
				},
			},
		];

		// const scanResults = await orchestrator.run(numericFieldFilters);

		// core/generics/ThresholdConfig.ts
		type ThresholdConfig<T> = Partial<Record<keyof T, number>>;

		const numericFieldThresholdFilters: DatasetScreenerConfig<
			Partial<Record<keyof NormalizedRestTickerSnapshot, number>>
		>[] = [
			{
				dataFilter: new ComposableDatasetFieldThresholdFilter<NormalizedRestTickerSnapshot>(),
				config: {
					volume__nz_tick: 1_000_000,
					change_pct__nz_tick: 2.5,
				} satisfies ThresholdConfig<NormalizedRestTickerSnapshot>,
			},
			{
				dataFilter: new ComposableDatasetFieldThresholdFilter<NormalizedRestTickerSnapshot>(),
				config: {
					volume__nz_tick: 1_000_000,
					price__nz_tick: 200,
				} satisfies ThresholdConfig<NormalizedRestTickerSnapshot>,
			}
		];

		const scanResults = await orchestrator.run(numericFieldThresholdFilters);

		// 5. Log results
		logger.info(
			{
				correlationId,
				found: scanResults.length,
				tickers: scanResults.map((t) => t.ticker_symbol__nz_tick),
			},
			"✅ Market scan complete"
		);
	} catch (error) {
		logger.error({ correlationId, error }, "❌ Market scan failed");
	} finally {
		stop();
	}
}
