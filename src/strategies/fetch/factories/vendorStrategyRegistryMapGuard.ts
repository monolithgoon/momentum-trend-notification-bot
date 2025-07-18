import { vendorStrategyRegistryMap } from "@strategies/fetch/registries/vendorStrategyRegistryMap";
import { vendorStrategyRegistryMapTypes } from "@strategies/fetch/types/vendorStrategyRegistryMap.type";

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
