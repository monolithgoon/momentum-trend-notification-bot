import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { FetchStrategy } from "@strategies/fetch/types/fetchStrategy.interface";
import { StrategyRegistry } from "@strategies/fetch/types/strategyRegistry.type";
import { vendorStrategyRegistryMap } from "@strategies/fetch/registries/vendorStrategyRegistryMap";
import { VendorStrategyRegistryMap } from "@strategies/fetch/types/vendorStrategyRegistryMap.type";

/**
 * Type guard: is vendor present in the registry map?
 */
export function isVendorWithRegistry(vendor: MarketDataVendors): vendor is keyof typeof vendorStrategyRegistryMap {
	return vendor in vendorStrategyRegistryMap;
}

/**
 * Runtime validation + type narrowing of vendor and strategy keys
 */
// FIXME -throwing errors
// export function isValidVendorAndStrategyKeys<
// 	T extends MarketDataVendors,
// 	R extends StrategyRegistry<FetchStrategy<any>>
// >(vendor: T, strategyKeys: string[]): vendor is T & keyof typeof vendorStrategyRegistryMap {
// 	if (!(vendor in vendorStrategyRegistryMap)) return false;

// 	const registry = vendorStrategyRegistryMap[vendor] as R;

// 	for (const key of strategyKeys) {
// 		if (!(key in registry)) return false;
// 	}

// 	return true;
// }

/**
 * Runtime validation + type narrowing of vendor and strategy keys
 */
export function isValidVendorAndStrategyKeys<Vendor extends keyof VendorStrategyRegistryMap>(
	vendor: Vendor,
	strategyKeys: string[]
): boolean {
	const registry = vendorStrategyRegistryMap[vendor];

	return strategyKeys.every((key) => key in registry);
}
