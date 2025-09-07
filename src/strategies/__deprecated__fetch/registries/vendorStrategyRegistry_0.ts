// vendorStrategyRegistry.ts

import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { polygnRestApiFetchStrategyRegistry } from "./polygnRestApiFetchStrategyRegistry";

// 1. Map of all vendor registries
export const vendorStrategyRegistryMap = {
	[MarketDataVendor.POLYGON]: polygnRestApiFetchStrategyRegistry,
	// [MarketDataVendor.EODHD]: strategyRegistryType<EodhdFetchStrategy>;
} as const;

// 2. Basic types
type MarketDataVendor = keyof typeof vendorStrategyRegistryMap;
type StrategyRegistry = (typeof vendorStrategyRegistryMap)[MarketDataVendor];
type StrategyKey = keyof StrategyRegistry;

// 3. Get strategy
export function getStrategy(vendor: MarketDataVendor, key: string) {
	return vendorStrategyRegistryMap[vendor][key as keyof (typeof vendorStrategyRegistryMap)[typeof vendor]];
}

// 4. Check if a strategy key is valid
export function isValidStrategyKey(vendor: MarketDataVendor, key: string): boolean {
	return key in vendorStrategyRegistryMap[vendor];
}
