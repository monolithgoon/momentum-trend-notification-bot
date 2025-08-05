import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { MarketScanStrategyPresetKey } from "./MarketScanStrategyPresetKey.enum";
import { RestApiQuoteFetcherAdapter } from "./adapters/RestApiQuoteFetcherAdapter.interface";

import { PolygonFetcherAdapter } from "./adapters/PolygonFetcherAdapter";
import { PolygonSnapshotTransformer } from "@core/models/rest_api/transformers/vendors/polygon/PolygonSnapshotTransformer";
import { PolygonMarketMoversFetcher } from "../fetch_2/vendors/polygon/fetchers/__deprecated__latest__PolygonMarketMoversFetcher";
import { PolygonMostActiveFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonMostActiveFetcher";
import { PolygonTopGainersFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonTopGainersFetcher";
import { PolygonTopLosersFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonTopLosersFetcher";
import { PolygonRecentIposFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonRecentIposFetcher";

import { FmpFetcherAdapter } from "./adapters/FmpFetcherAdapter";
import { FmpTopGainersFetcher } from "../fetch_2/vendors/fmp/fetchers/FmpTopGainersFetcher_2";
import { FmpTopGainersSnapshotTransformer } from "@core/models/rest_api/transformers/vendors/fmp/FmpTopGainersSnapshotTransformer";

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
	private adapterMap: Partial<Record<MarketScanStrategyPresetKey, RestApiQuoteFetcherAdapter>>;

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
	 * Maps ("registers") each scan strategy preset key (e.g. "MARKET_TOP_GAINERS")
	 * to a vendor-specific fetcher/transformer adapter implementation.
	 *
	 * Uses:
	 *   Partial<Record<MarketScanStrategyPresetKey, RestApiQuoteFetcherAdapter>>
	 *
	 * Meaning:
	 *   - Record<A, B> → all keys from A must be present, and their values are of type B.
	 *   - Partial<Record<A, B>> → all keys from A are optional, and values are of type B.
	 *     This allows each vendor to support only a subset of strategy presets.
	 *
	 * 🧠 Example:
	 *   const adapterMap: Partial<Record<MarketScanStrategyPresetKey, RestApiQuoteFetcherAdapter>> = {
	 *     [MarketScanStrategyPresetKey.MARKET_TOP_GAINERS]: new FmpFetcherAdapter(...),
	 *     // other strategies like MARKET_TOP_LOSERS can be omitted
	 *   };
	 *
	 * ⚠️ Each vendor should only register the strategies it supports.
	 * 💥 Missing keys will throw at runtime if `getAdapter(presetKey)` is called without a corresponding adapter.
	 */

	/**
	 * ⛔⛔⛔
	 * 
	 * Record<MarketScanStrategyPresetKey, RestApiQuoteFetcherAdapter>
	 *
	 * This type enforces a complete mapping:
	 * - Every strategy key in MarketScanStrategyPresetKey **must** be implemented.
	 * - All keys are required and must be uniquely assigned.
	 *
	 * ❌ Use this only when every strategy is guaranteed to be supported by every vendor.
	 *
	 * Example:
	 * const adapterMap: Record<MarketScanStrategyPresetKey, RestApiQuoteFetcherAdapter> = {
	 *   [PresetKey.MOST_ACTIVE]: new PolygonAdapter(...),
	 *   [PresetKey.TOP_GAINERS]: new PolygonAdapter(...),
	 *   [PresetKey.TOP_LOSERS]: new PolygonAdapter(...),
	 *   ...
	 * };
	 */

	private buildAdapterMap(
		vendor: MarketDataVendor
	): Partial<Record<MarketScanStrategyPresetKey, RestApiQuoteFetcherAdapter>> {
		switch (vendor) {
			case MarketDataVendor.POLYGON:
				return {
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
			case MarketDataVendor.FMP:
				return {
					[MarketScanStrategyPresetKey.MARKET_TOP_GAINERS]: new FmpFetcherAdapter(
						new FmpTopGainersFetcher(),
						new FmpTopGainersSnapshotTransformer()
					),
				};
			default:
				throw new Error(`Unsupported market data vendor: ${vendor}`);
		}
	}
}
