import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { polygnRestApiFetchStrategyRegistry } from "./polygnRestApiFetchStrategyRegistry";
import { strategyRegistryType } from "../types/strategyRegistry.type";
import { PolygonRestApiQuoteFetchStrategy } from "../vendors/polygon/types/PolygonRestApiQuoteFetchStrategy.interface";

export type VendorStrategyRegistryMapTypes = {
	[MarketDataVendor.POLYGON]: strategyRegistryType<PolygonRestApiQuoteFetchStrategy>;
	// [MarketDataVendor.EODHD]: strategyRegistryType<EodhdFetchStrategy>;
};
export const vendorStrategyRegistryMap: VendorStrategyRegistryMapTypes = {
	[MarketDataVendor.POLYGON]: polygnRestApiFetchStrategyRegistry,
	// [MarketDataVendor.EODHD]: eodhdRestApiFetchStrategyRegistry,
};

/**
 * Type guard: is vendor present in the registry map?
 * Runtime validation + type narrowing of vendor and strategy keys
 */
export function isValidVendorAndStrategyRegistryMapKeys<Vendor extends keyof VendorStrategyRegistryMapTypes>(
	vendor: Vendor,
	strategyKeys: string[]
): boolean {
	const registry = vendorStrategyRegistryMap[vendor];

	return strategyKeys.every((key) => key in registry);
}
