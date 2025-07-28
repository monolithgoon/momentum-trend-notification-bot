// src/interfaces/strategies/fetchStrategy.interface.ts

/**
 * Base interface for all fetch strategies, regardless of vendor.
 * T represents the raw snapshot format (e.g., PolygonRestTickerSnapshot).
 */
export interface RestApiQuoteFetcher<T> {
	/**
	 * Executes the strategy and returns raw vendor-specific snapshots.
	 */
	fetch(): Promise<T[]>;
}
