import { MarketScanStrategyPresetKey } from "./MarketScanStrategyPresetKey.enum";
import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { PolygonTickerTransformer } from "@core/models/transformers/vendors/polygon/PolygonTickerTransformer";
import { PolygonMarketMoversFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonMarketMoversFetcher";
import { PolygonRecentIposFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonRecentIposFetcher";
import { PolygonFetcherAdapter } from "./adapters/PolygonFetcherAdapter";
import { RestApiQuoteFetcherAdapter } from "./adapters/RestApiQuoteFetcherAdapter.interface";

/**
 * Resolves the appropriate quote fetcher adapter based on:
 * - Market data vendor (e.g., Polygon)
 * - Strategy preset (e.g., Pre-market Movers, Recent IPOs)
 *
 * Example:
 * const registry = new MarketScanAdapterRegistry(MarketDataVendor.POLYGON);
 * const adapter = registry.getAdapter(MarketScanStrategyPresetKey.TOP_MARKET_MOVERS);
 */
export class MarketScanAdapterRegistry {
	private adapterMap: Record<MarketScanStrategyPresetKey, RestApiQuoteFetcherAdapter>;

	constructor(vendor: MarketDataVendor) {
		this.adapterMap = this.buildAdapterMap(vendor);
	}

	/**
	 * Maps ("registers") each scan strategy preset key (eg. "TOP_MARKET_MOVERS") to a vendor-specific adapter implementation
	 * Currently supports Polygon.
	 */
	private buildAdapterMap(vendor: MarketDataVendor): Record<MarketScanStrategyPresetKey, RestApiQuoteFetcherAdapter> {
		switch (vendor) {
			case MarketDataVendor.POLYGON:
				return {
					[MarketScanStrategyPresetKey.TOP_MARKET_MOVERS]: new PolygonFetcherAdapter(
						MarketSession.PRE_MARKET,
						new PolygonMarketMoversFetcher(),
						new PolygonTickerTransformer()
					),
					[MarketScanStrategyPresetKey.RECENT_IPO]: new PolygonFetcherAdapter(
						MarketSession.RTH,
						new PolygonRecentIposFetcher(),
						new PolygonTickerTransformer()
					),
				};
			default:
				throw new Error(`Unsupported market data vendor: ${vendor}`);
		}
	}

	/**
	 * Returns a quote fetcher adapter for a given market scan strategy preset.
	 * Returns the adapter that corresponds to the given market scan strategy preset.
	 * @throws If no adapter is defined for the given preset.
	 */
	public getAdapter(presetKey: MarketScanStrategyPresetKey): RestApiQuoteFetcherAdapter {
		const adapter = this.adapterMap[presetKey];
		if (!adapter) {
			throw new Error(`Fetcher not found for this market scan preset key: ${presetKey}`);
		}
		return adapter;
	}
}
