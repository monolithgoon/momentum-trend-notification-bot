import { MarketDataVendors } from "@core/enums/MarketDataVendors.enum";
import { PolygonTickerTransformer } from "@core/models/transformers/vendors/polygon/PolygonTickerTransformer";
import { PolygonMarketQuoteFetcher } from "../vendors/polygon/fetchers/PolygonMarketQuoteFetcher";
import { SessionMarketQuoteFetcher } from "../types/SessionMarketQuoteFetcher.interface";
import {
	getStrategy,
	isValidStrategyKey,
	StrategyKey,
	Vendor,
	StrategyInstance,
	vendorStrategyRegistryMap,
} from "../registries/vendorStrategyRegistry";

export function getMarketQuoteFetcherForStrategies<V extends Vendor>(
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
