import { MarketDataVendors } from "@core/enums/MarketDataVendors.enum";
import { SessionMarketQuoteFetcher } from "@core/strategies/fetch/types/SessionMarketQuoteFetcher";
import { PolygonMarketQuoteFetcher } from "@core/strategies/fetch/vendors/polygon/fetchers/PolygonMarketQuoteFetcher";
import { PolygonTickerTransformer } from "@core/snapshots/rest_api/transformers/vendors/polygon/PolygonTickerTransformer";
import { isValidVendorAndStrategyRegistryMapKeys, vendorStrategyRegistryMap } from "@core/strategies/fetch/registries/vendorStrategyRegistryMap";

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
