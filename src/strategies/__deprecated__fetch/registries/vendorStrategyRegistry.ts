import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { polygnRestApiFetchStrategyRegistry } from "./polygnRestApiFetchStrategyRegistry";

// ========================
// 1. Registry Definitions
// ========================

// Expandable: Add more vendor registries here
export const vendorStrategyRegistryMap = {
  [MarketDataVendor.POLYGON]: polygnRestApiFetchStrategyRegistry,
  // [MarketDataVendor.EODHD]: eodhdRestApiFetchStrategyRegistry,
} as const;

// ========================
// 2. Type Inference
// ========================

export type VendorStrategyRegistryMap = typeof vendorStrategyRegistryMap;
export type Vendor = keyof VendorStrategyRegistryMap;

export type StrategyRegistry<V extends Vendor> = VendorStrategyRegistryMap[V];
export type StrategyKey<V extends Vendor> = keyof StrategyRegistry<V>;
export type StrategyInstance<V extends Vendor, K extends StrategyKey<V>> =
  StrategyRegistry<V>[K];

// ========================
// 3. Utility Functions
// ========================

/**
 * Get a strategy instance for a given vendor + strategy key
 */
export function getStrategy<V extends Vendor, K extends StrategyKey<V>>(
  vendor: V,
  key: K
): StrategyInstance<V, K> {
  return vendorStrategyRegistryMap[vendor][key];
}

/**
 * Type guard to validate a strategy key exists for a given vendor
 */
export function isValidStrategyKey<V extends Vendor>(
  vendor: V,
  key: PropertyKey
): key is StrategyKey<V> {
  return key in vendorStrategyRegistryMap[vendor];
}
