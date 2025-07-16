import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { VendorStrategyRegistryMap } from "../types/vendorStrategyRegistryMap.type";
import { polygonFetchStrategyRegistry } from "./polygnFetchStrategyRegistry";

export const vendorStrategyRegistryMap: VendorStrategyRegistryMap = {
	[MarketDataVendors.POLYGON]: polygonFetchStrategyRegistry,
	// [MarketDataVendors.EODHD]: eodhdFetchStrategyRegistry,
};
