// vendorStrategyRegistry.ts

import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { polygnRestApiFetchStrategyRegistry } from "./polygnRestApiFetchStrategyRegistry";

// 1. Map of all vendor registries
export const vendorStrategyRegistryMap = {
	[MarketDataVendors.POLYGON]: polygnRestApiFetchStrategyRegistry,
	// [MarketDataVendors.EODHD]: strategyRegistryType<EodhdFetchStrategy>;
} as const;

// 2. Basic types
type marketDataVendor = keyof typeof vendorStrategyRegistryMap;
type StrategyRegistry = (typeof vendorStrategyRegistryMap)[marketDataVendor];
type StrategyKey = keyof StrategyRegistry;

// 3. Get strategy
export function getStrategy(vendor: marketDataVendor, key: string) {
	return vendorStrategyRegistryMap[vendor][key as keyof (typeof vendorStrategyRegistryMap)[typeof vendor]];
}

// 4. Check if a strategy key is valid
export function isValidStrategyKey(vendor: marketDataVendor, key: string): boolean {
	return key in vendorStrategyRegistryMap[vendor];
}
