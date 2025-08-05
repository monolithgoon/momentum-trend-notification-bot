import { BaseInternalTickerSnapshot } from "@core/models/rest_api/BaseInternalTickerSnapshot.interface";
import { GenericDatasetFilter } from "./GenericDatasetFilter.interface";

/**
 * CompositeFilterScreener applies multiple scan filters to a set of market data snapshots.
 *
 * Features:
 * - Accepts pre-fetched market data (e.g., from a session or vendor).
 * - Runs each configured GenericDatasetFilter with its associated config on the dataset.
 * - Aggregates all matching results into a single array.
 * - Deduplicates results by ticker symbol to ensure uniqueness.
 *
 * Useful for applying multiple strategies (such as volume spike or price delta)
 * to the same dataset, where results may overlap.
 *
 * @param marketData - The market data snapshots to screen.
 * @returns A deduplicated list of tickers that matched at least one filter.
 */

/**
 * A generic screener that applies multiple filters to ticker snapshots
 * and deduplicates based on a given key.
 */

export class CompositeFilterScreener<T extends BaseInternalTickerSnapshot> {
	constructor(
		private scanFilters: {
			dataFilter: GenericDatasetFilter<any, T>;
			config: any;
		}[]
	) {}

	runScreener(dataset: T[]): T[] {
		return this.scanFilters.flatMap(({ dataFilter, config }) => dataFilter.runFilter(dataset, config));
	}
}
