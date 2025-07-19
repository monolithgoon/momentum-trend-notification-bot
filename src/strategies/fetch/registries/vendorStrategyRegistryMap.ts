import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { polygnRestApiFetchStrategyRegistry } from "./polygnRestApiFetchStrategyRegistry";
import { strategyRegistryType } from "../types/strategyRegistry.type";
import { PolygonRestApiQuoteFetchStrategy } from "../vendors/polygon/types/PolygonRestApiQuoteFetchStrategy.interface";

export type vendorStrategyRegistryMapTypes = {
	[MarketDataVendors.POLYGON]: strategyRegistryType<PolygonRestApiQuoteFetchStrategy>;
	// [MarketDataVendors.EODHD]: strategyRegistryType<EodhdFetchStrategy>;
};
// Diagram the flow of interactions and inheritance from isValidVendorAndStrategyRegistryMapKeys()
export const vendorStrategyRegistryMap: vendorStrategyRegistryMapTypes = {
	[MarketDataVendors.POLYGON]: polygnRestApiFetchStrategyRegistry,
	// [MarketDataVendors.EODHD]: eodhdRestApiFetchStrategyRegistry,
};
