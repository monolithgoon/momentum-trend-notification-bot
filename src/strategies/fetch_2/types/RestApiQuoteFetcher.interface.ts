import { MarketSession } from "@core/enums/MarketSession.enum";

/**
 * Base interface for all market data fetchers, regardless of vendor.
 * T represents the raw snapshot format (e.g., PolygonRestTickerSnapshot).
 */
export interface RestApiQuoteFetcher<T> {
	/**
	 * Rurns raw vendor-specific snapshots.
	 */
	fetch(session: MarketSession): Promise<T[]>;
}