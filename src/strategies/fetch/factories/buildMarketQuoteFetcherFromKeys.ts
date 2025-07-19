import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { SessionMarketQuoteFetcher } from "@strategies/fetch/types/SessionMarketQuoteFetcher";
import { PolygonMarketQuoteFetcher } from "@strategies/fetch/vendors/polygon/fetchers/PolygonMarketQuoteFetcher";
import { PolygonTickerTransformer } from "@data/snapshots/rest_api/transformers/vendors/polygon/polygonTickerTransformer";
import { vendorStrategyRegistryMap } from "@strategies/fetch/registries/vendorStrategyRegistryMap";
import { isValidVendorAndStrategyRegistryMapKeys } from "@strategies/fetch/factories/vendorStrategyRegistryMapGuard";

export function buildMarketQuoteFetcherFromKeys(
	vendor: MarketDataVendors,
	strategyKeys: string[]
): SessionMarketQuoteFetcher {
	//  Runtime validation + type narrowing of vendor & strategy keys
	if (!isValidVendorAndStrategyRegistryMapKeys(vendor, strategyKeys)) {
		throw new Error(`Invalid vendor (${vendor}) or one or more strategy keys: ${strategyKeys.join(", ")}`);
	}

	const strategyRegistry = vendorStrategyRegistryMap[vendor];
	const strategies = strategyKeys.map((key) => strategyRegistry[key]!); // safe due to guard

	switch (vendor) {
		case MarketDataVendors.POLYGON:
			// extracted vendor-specific instantiation
			return new PolygonMarketQuoteFetcher(new PolygonTickerTransformer(), strategies);

		// Future: return new EodhdMarketDataFetcher(...)

		default:
			throw new Error(`Unsupported vendor: ${vendor}`);
	}
}
