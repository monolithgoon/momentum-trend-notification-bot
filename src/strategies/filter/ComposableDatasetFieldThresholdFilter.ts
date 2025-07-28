import { GenericDatasetFilter } from "./GenericDatasetFilter.interface";

/**
 * A generic threshold-based filter that filters T records
 * where each configured numeric field exceeds a given threshold.
 */

export class ComposableDatasetFieldThresholdFilter<
	TData extends Record<string, any>,
	TConfig extends Record<keyof TData, number> = Record<keyof TData, number>
> implements GenericDatasetFilter<TConfig, TData>
{
	readonly name = "ComposableDatasetFieldThresholdFilter";
	readonly description = "Filters based on supplied field thresholds";

	runFilter(data: TData[], config: TConfig): TData[] {
		return data.filter((item) =>
			Object.entries(config).every(([field, threshold]) => {
				const value = item[field as keyof TData];
				return typeof value === "number" && value >= threshold;
			})
		);
	}
}

/**
 * ComposableDatasetFieldThresholdFilter<TData, TConfig>
 * ------------------------------------------
 * A reusable, generic filtering strategy that filters an array of objects based on numeric
 * threshold values defined per field. It implements the `FilterStrategy<TConfig, TData>` interface,
 * making it compatible with orchestrated scan or screening pipelines.
 *
 * 🛠 HOW IT WORKS:
 * - The `config` defines minimum threshold values for one or more fields.
 * - For each item in the input array, the filter checks whether all specified fields
 *   meet or exceed their corresponding threshold.
 * - It returns only the items that pass all threshold checks.
 *
 * ✅ USE CASES:
 * - Used in live market scan pipelines to filter tickers based on volume, price change %, etc.
 * - Plugged into the `MarketScanOrchestrator.run()` method as a composable field-based filter.
 * - Can be reused across other scanning or screening contexts, such as leaderboards or
 *   pre-market screeners, as long as the data is structured and numeric fields are present.
 *
 * 📍 Called from:
 * - `runLiveMarketScannerTask.ts`: passed into `MarketScanOrchestrator` as part of the `DatasetScreenerConfig`.
 * - `MarketScanOrchestrator.ts`: receives the filter and executes it over snapshots returned by the quote scanner.
 *
 * 📦 EXAMPLE CONFIG:
 * const config = {
 *   volume: 1_000_000,
 *   change_pct__nz_tick: 2.5
 * };
 *
 * const filter = new ComposableDatasetFieldThresholdFilter<NormalizedRestTickerSnapshot>();
 * const results = filter.runFilter(snapshots, config);
 *
 * 🧩 COMPOSABLE?
 * While named "Composable", this filter is primarily plug-and-play.
 * Composition in this context means it can be part of a broader filtering system like
 * `MultiscanFilterScreener`, but it does not currently support logical chaining (e.g., .and(), .or()).
 */
