import {
	getStrategy,
	isValidStrategyKey,
	StrategyKey,
	Vendor,
	StrategyInstance,
	vendorStrategyRegistryMap,
} from "../registries/vendorStrategyRegistry";
import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { SessionMarketQuoteFetcher } from "../types/SessionMarketQuoteFetcher";
import { PolygonMarketQuoteFetcher } from "../vendors/polygon/fetchers/PolygonMarketQuoteFetcher";
import { PolygonTickerTransformer } from "@core/snapshots/rest_api/transformers/vendors/polygon/PolygonTickerTransformer";

export function buildMarketQuoteFetcherFromKeys<V extends Vendor>(
	vendor: V,
	strategyKeys: string[]
): SessionMarketQuoteFetcher {
	const registry = vendorStrategyRegistryMap[vendor];
  // Validate vendor exists in the registry
  if (!registry) {
    throw new Error(`Unsupported vendor: ${vendor}`);
  }

	const invalid = strategyKeys.find((key) => !isValidStrategyKey(vendor, key));
	if (invalid) {
		throw new Error(`Invalid strategy key "${invalid}" for vendor "${vendor}"`);
	}

	// ✅ Type-safe: key is now StrategyKey<V> due to guard above
	const strategies = strategyKeys.map((key) => getStrategy(vendor, key as StrategyKey<V>));

	switch (vendor) {
		case MarketDataVendors.POLYGON:
			return new PolygonMarketQuoteFetcher(
				new PolygonTickerTransformer(),
				strategies as StrategyInstance<V, StrategyKey<V>>[]
			);

		default:
			throw new Error(`Unsupported vendor: ${vendor}`);
	}
}
