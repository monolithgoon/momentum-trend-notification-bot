import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { polygnRestApiFetchStrategyRegistry } from "./polygnRestApiFetchStrategyRegistry";
import { strategyRegistryType } from "../types/strategyRegistry.type";
import { PolygonRestApiQuoteFetchStrategy } from "../vendors/polygon/types/PolygonRestApiQuoteFetchStrategy.interface";

export type vendorStrategyRegistryMapTypes = {
	[MarketDataVendors.POLYGON]: strategyRegistryType<PolygonRestApiQuoteFetchStrategy>;
	// [MarketDataVendors.EODHD]: strategyRegistryType<EodhdFetchStrategy>;
};
export const vendorStrategyRegistryMap: vendorStrategyRegistryMapTypes = {
	[MarketDataVendors.POLYGON]: polygnRestApiFetchStrategyRegistry,
	// [MarketDataVendors.EODHD]: eodhdRestApiFetchStrategyRegistry,
};

/**
 * Type guard: is vendor present in the registry map?
 * Runtime validation + type narrowing of vendor and strategy keys
 */
export function isValidVendorAndStrategyRegistryMapKeys<Vendor extends keyof vendorStrategyRegistryMapTypes>(
	vendor: Vendor,
	strategyKeys: string[]
): boolean {
	const registry = vendorStrategyRegistryMap[vendor];

	return strategyKeys.every((key) => key in registry);
}
