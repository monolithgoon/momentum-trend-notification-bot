import { MarketSession } from "../../config/constants";
import { MarketSessionFetcher } from "../../market_data_providers/polygon/interfaces/marketSession.interface";
import { ScanStrategy } from "./scanStrategies";
/**
 * MarketSessionScanner is responsible for scanning market sessions using various strategies.
 * It fetches data from a provider and applies multiple scan strategies to filter results.
 * Runs all configured scan strategies against the provided market session data.
 *
 * - Fetches raw market data using the injected data provider.
 * - Executes each scan strategy with its associated config on the same dataset.
 * - Aggregates all results into a single flat array.
 * - Since multiple strategies can return overlapping symbols (e.g., "AAPL" from both Strategy A and B),
 *   the combined result may contain duplicates.
 * - To ensure uniqueness, the final result is deduplicated using a Set before returning.
 *
 * @param session - The market session to scan.
 * @returns A deduplicated array of matched symbols from all strategies.
 */

export class MarketSessionScanner {
	constructor(
		private dataProvider: MarketSessionFetcher,
		private strategies: { strategy: ScanStrategy<any>; config: any }[]
	) {}

	async runScan(session: MarketSession): Promise<string[]> {
		const all = await this.dataProvider.getData(session);

		const results = this.strategies.flatMap(({ strategy, config }) => strategy.runFilter(all, config));

		// Optionally dedupe
		return [...new Set(results)];
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
