// app.ts
import { APP_CONFIG } from "./config";
import { PolygonMarketDataFetcher } from "./strategies/fetch/data_vendors/polygon/fetchers/polygonMarketDataFetcher";
import {
	VolumeChangeScanFilter,
	PriceChangeScanFilter,
} from "./strategies/scan/scanFilters";

export function createScannerApp() {
	const fetcher = new PolygonMarketDataFetcher();
	const scanner = new MarketSnapshotScanner(fetcher, [
		{
			scanFilter: new VolumeChangeScanFilter(),
			config: { volumeThreshold: 1_000_000, changePercentageThreshold: 3 },
		},
		{
			scanFilter: new PriceChangeScanFilter(),
			config: { minPriceJump: 2.5 },
		},
	]);

	return { scanner, config: APP_CONFIG };
}
