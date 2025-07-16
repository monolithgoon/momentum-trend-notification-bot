// src/factories/selectMarketDataFetcher.ts
import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { MarketDataFetcher } from "@core/interfaces/marketDataFetcher.interface";
import { PolygonMarketDataFetcher_2 } from "@strategies/fetch/data_vendors/polygon/fetchers/polygonMarketDataFetcher_2";
import { PolygonTickerTransformer } from "@strategies/fetch/data_vendors/polygon/transformers/polygonTickerTransformer";

export function buildMarketDataFetcher(vendor: MarketDataVendors, strategyKey: string): MarketDataFetcher {
	switch (vendor) {
		case MarketDataVendors.POLYGON:
			return new PolygonMarketDataFetcher_2(new PolygonTickerTransformer(), strategyKey);

		// case MarketDataVendors.EODHD:
		// 	console.error(`Unsupported vendor: ${vendor}`);
		// return new EODHDMarketFetcher(new EODHDTransformer(), eodhdFetchStrategyRegistry);

		default:
			throw new Error(`Unsupported vendor: ${vendor}`);
	}
}
