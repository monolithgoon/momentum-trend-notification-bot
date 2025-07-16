import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { StrategyRegistry } from "./strategyRegistry.type";
import { PolygonFetchStrategy_2 } from "../data_vendors/polygon/types/polygonFetchStrategy.interface";

// TODO: import EODHD strategy types when implemented
// import { EodhdFetchStrategy } from "@/interfaces/strategies/eodhdFetchStrategy.interface";

export type VendorStrategyRegistryMap = {
	[MarketDataVendors.POLYGON]: StrategyRegistry<PolygonFetchStrategy_2>;
	// [MarketDataVendors.EODHD]: StrategyRegistry<EodhdFetchStrategy>;
};
