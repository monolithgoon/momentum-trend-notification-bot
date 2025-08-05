import { MarketScanStrategyPresetKey } from "./MarketScanStrategyPresetKey.enum";

import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { MarketSession } from "@core/enums/MarketSession.enum";

import { FlatRawPolygonTickerSnapshot } from "@core/models/rest_api/vendors/polygon/PolygonRestTickerSnapshot.interface";
// import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";
// import { PolygonSnapshotTransformer } from "@core/models/rest_api/transformers/vendors/polygon/__deprecated__PolygonSnapshotTransformer";

// import { PolygonMarketMoversFetcher } from "../fetch_2/vendors/polygon/fetchers/__deprecated__PolygonMarketMoversFetcher";
import { PolygonRecentIposFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonRecentIposFetcher";
import { PolygonFetcherAdapter } from "./adapters/PolygonFetcherAdapter";
import { RestApiQuoteFetcherAdapter } from "./adapters/RestApiQuoteFetcherAdapter.interface";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/models/NormalizedRestTickerSnapshot.interface";

/**
 * Registry for managing and providing quote fetcher adapters for different market scan presets
 * based on the selected market data vendor.
 *
 * The `MarketScanAdapterRegistry` class maps scan preset keys to their corresponding
 * `RestApiQuoteFetcherAdapter` implementations, allowing consumers to retrieve the appropriate
 * adapter for a given scan preset and vendor.
 *
 * @remarks
 * - Currently supports the `POLYGON` vendor with adapters for premarket top movers and recent IPOs.
 * - Throws an error if an unknown vendor is provided or if a fetcher is not found for a given scan preset.
 *
 * @usage
 * ```typescript
 * const ar = new MarketScanAdapterRegistry(MarketDataVendor.POLYGON);
 * const adapter = ar.getQuoteFetcherAdapter(MarketScanStrategyPresetKey.TOP_MARKET_MOVERS);
 * ```
 */

export class MarketScanAdapterRegistry {
	private scanPresetMap: Record<
		MarketScanStrategyPresetKey,
		RestApiQuoteFetcherAdapter<FlatRawPolygonTickerSnapshot, NormalizedRestTickerSnapshot>
	>;

	constructor(vendor: MarketDataVendor) {
		this.scanPresetMap = this.loadVendorFetcherAdapters(vendor);
	}

	// Maps each preset key to its specific adapter for the selected vendor
	private loadVendorFetcherAdapters(
		vendor: MarketDataVendor
	): Record<
		MarketScanStrategyPresetKey,
		RestApiQuoteFetcherAdapter<FlatRawPolygonTickerSnapshot, NormalizedRestTickerSnapshot>
	> {
		switch (vendor) {
			case MarketDataVendor.POLYGON:
				return {
					// Adapter: fetch premarket data and normalize to internal snapshot format
					[MarketScanStrategyPresetKey.TOP_MARKET_MOVERS]: new PolygonFetcherAdapter(
						MarketSession.PRE_MARKET,
						new PolygonMarketMoversFetcher(),
						new PolygonSnapshotTransformer()
					),
					// Adapter: fetch recent IPO data and normalize
					[MarketScanStrategyPresetKey.RECENT_IPO]: new PolygonFetcherAdapter(
						MarketSession.RTH, // Use PRE_MARKET if needed
						new PolygonRecentIposFetcher(),
						new PolygonSnapshotTransformer()
					),
				};
			default:
				// Will break loudly if vendor is unsupported
				throw new Error(`Unknown vendor: ${vendor}`);
		}
	}

	/**
	 * Retrieves the quote fetcher adapter associated with the specified market scan strategy preset key.
	 *
	 * @param key - The key identifying the market scan strategy preset.
	 * @returns The corresponding `RestApiQuoteFetcherAdapter` for the given preset key.
	 * @throws Error if no quote fetcher adapter is found for the provided preset key.
	 */
	public getQuoteFetcherAdapter(
		key: MarketScanStrategyPresetKey
	): RestApiQuoteFetcherAdapter<FlatRawPolygonTickerSnapshot, NormalizedRestTickerSnapshot> {
		const quoteFetcher = this.scanPresetMap[key];
		if (!quoteFetcher) throw new Error(`Fetcher not found for this scan preset: ${key}`);
		return quoteFetcher;
	}
}
