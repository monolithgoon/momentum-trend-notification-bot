import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { MarketDataFetcher } from "@core/interfaces/marketDataFetcher.interface";
import { PolygonMarketDataFetcher_3 } from "@strategies/fetch/data_vendors/polygon/fetchers/polygonMarketDataFetcher_2";
import { PolygonTickerTransformer } from "@strategies/fetch/data_vendors/polygon/transformers/polygonTickerTransformer";
import { PolygonFetchStrategy_2 } from "@strategies/fetch/data_vendors/polygon/types/polygonFetchStrategy.interface";
import { vendorStrategyRegistryMap } from "@strategies/fetch/registries/vendorStrategyRegistryMap";
import { isValidVendorAndStrategyKeys } from "@utils/marketDataVendorGuards";

function buildVendorFetcher(
	vendor: MarketDataVendors,
	strategies: any[] // can narrow per vendor
): MarketDataFetcher {
	switch (vendor) {
		case MarketDataVendors.POLYGON:
			return new PolygonMarketDataFetcher_3(new PolygonTickerTransformer(), strategies as PolygonFetchStrategy_2[]);

		default:
			throw new Error(`No fetcher builder implemented for vendor: ${vendor}`);
	}
}

export function buiildMarketDataFetcherFromkeys(vendor: MarketDataVendors, strategyKeys: string[]): MarketDataFetcher {

	// 
	if (!isValidVendorAndStrategyKeys(vendor, strategyKeys)) {
		throw new Error(`Invalid vendor (${vendor}) or one or more strategy keys: ${strategyKeys.join(", ")}`);
	}

	const strategyRegistry = vendorStrategyRegistryMap[vendor];
	const strategies = strategyKeys.map((key) => strategyRegistry[key]!); // safe due to guard

	switch (vendor) {
		case MarketDataVendors.POLYGON:
			return new PolygonMarketDataFetcher_3(new PolygonTickerTransformer(), strategies);

		// Future: return new EodhdMarketDataFetcher(...)

		default:
			throw new Error(`Unsupported vendor: ${vendor}`);
	}

	return buildVendorFetcher(vendor, strategies); // extracted vendor-specific instantiation
}
