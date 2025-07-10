// app.ts
import { APP_CONFIG } from "./config";
import { MarketSessionScanner } from "./services/scanners/marketSessionScanner";
import { PolygonMarketFetcher } from "./market_data_providers/polygon/polygonDataFetcher";
import {
	VolumeChangeScanStrategy,
	PriceChangeScanStrategy,
} from "./services/scanners/scanStrategies";

export function createScannerApp() {
	const fetcher = new PolygonMarketFetcher();
	const scanner = new MarketSessionScanner(fetcher, [
		{
			strategy: new VolumeChangeScanStrategy(),
			config: { volumeThreshold: 1_000_000, changePercentageThreshold: 3 },
		},
		{
			strategy: new PriceChangeScanStrategy(),
			config: { minPriceJump: 2.5 },
		},
	]);

	return { scanner, config: APP_CONFIG };
}
