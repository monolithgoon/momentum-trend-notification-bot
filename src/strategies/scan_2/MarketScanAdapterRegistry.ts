// import { MarketScanStrategyPresetKey } from "./MarketScanStrategyPresetKey.enum";
import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { PolygonSnapshotTransformer } from "@core/models/rest_api/transformers/vendors/polygon/PolygonSnapshotTransformer";
import { PolygonMarketMoversFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonMarketMoversFetcher";
import { PolygonRecentIposFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonRecentIposFetcher";
import { PolygonFetcherAdapter } from "./adapters/PolygonFetcherAdapter";
import { RestApiQuoteFetcherAdapter } from "./adapters/RestApiQuoteFetcherAdapter.interface";
import { PolygonMostActiveFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonMostActiveFetcher";
import { PolygonTopGainersFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonTopGainersFetcher";
import { PolygonTopLosersFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonTopLosersFetcher";
import { MarketScanStrategyPresetKey } from "./MarketScanStrategyPresetKey.enum";

/**
 * Resolves the appropriate quote fetcher adapter based on:
 * - Market data vendor (e.g., Polygon)
 * - Strategy preset (e.g., Pre-market Movers, Recent IPOs)
 *
 * Example:
 * const registry = new MarketScanAdapterRegistry(MarketDataVendor.POLYGON);
 * const adapter = registry.getAdapter(MarketScanStrategyPresetKey.MARKET_TOP_MOVERS);
 */
export class MarketScanAdapterRegistry {
	private adapterMap: Record<MarketScanStrategyPresetKey, RestApiQuoteFetcherAdapter>;

	constructor(vendor: MarketDataVendor) {
		this.adapterMap = this.buildAdapterMap(vendor);
	}

	/**
	 * Returns a quote fetcher adapter for a given market scan strategy preset.
	 * Returns the adapter that corresponds to the given market scan strategy preset.
	 * @throws If no adapter is defined for the given preset.
	 */
	public getAdapter(presetKey: MarketScanStrategyPresetKey): RestApiQuoteFetcherAdapter {
		const adapter = this.adapterMap[presetKey];
		if (!adapter) {
			throw new Error(`Fetcher adapter not found for this market scan preset key: ${presetKey}`);
		}
		return adapter;
	}

	/**
	 * Maps ("registers") each scan strategy preset key (eg. "MARKET_TOP_MOVERS") to a vendor-specific adapter implementation
	 * Currently supports Polygon.
	 * REQUIRED: every strategy in MarketScanStrategyPresetKey.enum must be implementd
	 * REQUIRED: keys must be unique
	 */
	private buildAdapterMap(vendor: MarketDataVendor): Record<MarketScanStrategyPresetKey, RestApiQuoteFetcherAdapter> {
		switch (vendor) {
			case MarketDataVendor.POLYGON:
				return {
					// REMOVE -> Top market movers
					[MarketScanStrategyPresetKey.MARKET_TOP_MOVERS]: new PolygonFetcherAdapter(
						new PolygonMarketMoversFetcher(),
						new PolygonSnapshotTransformer()
					),

					// Most active tickers
					[MarketScanStrategyPresetKey.MARKET_MOST_ACTIVE]: new PolygonFetcherAdapter(
						new PolygonMostActiveFetcher(),
						new PolygonSnapshotTransformer()
					),

					// Top Market gainers
					[MarketScanStrategyPresetKey.MARKET_TOP_GAINERS]: new PolygonFetcherAdapter(
						new PolygonTopGainersFetcher(),
						new PolygonSnapshotTransformer()
					),

					// Top market losers
					[MarketScanStrategyPresetKey.MARKET_TOP_LOSERS]: new PolygonFetcherAdapter(
						new PolygonTopLosersFetcher(),
						new PolygonSnapshotTransformer()
					),

					// Recent IPOs
					[MarketScanStrategyPresetKey.MARKET_TOP_RECENT_IPO]: new PolygonFetcherAdapter(
						new PolygonRecentIposFetcher(),
						new PolygonSnapshotTransformer()
					),
				};
			default:
				throw new Error(`Unsupported market data vendor: ${vendor}`);
		}
	}
}
