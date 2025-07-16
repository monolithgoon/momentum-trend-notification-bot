
/**
 * SnapshotScreener applies one or more scan filters to a set of market data snapshots.
 *
 * Responsibilities:
 * - Accepts pre-fetched market data (e.g. from a specific session or vendor).
 * - Runs each configured scanFilter with its associated config on the dataset.
 * - Aggregates all matching results into a single array.
 * - Deduplicates results by ticker symbol to ensure uniqueness.
 *
 * Useful when multiple strategies (e.g., volume spike, price delta) are applied to the same dataset
 * and may return overlapping tickers.
 *
 * @param data - The market data snapshots to screen.
 * @returns A deduplicated list of tickers that matched at least one filter.
 */

import { InternalTickerSnapshot } from "@data/snapshots/types/internalTickerSnapshot.interface";
import { ScanFilter } from "./types/scanFilter.interface";

export class SnapshotScreener {
	constructor(private scanFilters: { scanFilter: ScanFilter<any>; config: any }[]) {}

	runScreener(marketData: InternalTickerSnapshot[]): InternalTickerSnapshot[] {
		const results = this.scanFilters.flatMap(({ scanFilter, config }) => scanFilter.runFilter(marketData, config));

		const uniqueByTicker = new Map<string, InternalTickerSnapshot>();
		for (const snapshot of results) {
			if (snapshot.ticker) uniqueByTicker.set(snapshot.ticker, snapshot);
		}

		return [...uniqueByTicker.values()];
	}
}

/**
 * Example usage of array methods:
 *
 * const input = [1, 2, 3];
 *
 * flatMap flattens the result by one level:
 * const flatMapped = input.flatMap(n => [n, n * 10]);
 * Result: [1, 10, 2, 20, 3, 30]
 *
 * map returns an array of arrays:
 * const mapped = input.map(n => [n, n * 10]);
 * Result: [[1, 10], [2, 20], [3, 30]]
 *
 * forEach executes a function for each element (no return value):
 * input.forEach(n => console.log(n * 10));
 * Logs: 10, 20, 30
 */
