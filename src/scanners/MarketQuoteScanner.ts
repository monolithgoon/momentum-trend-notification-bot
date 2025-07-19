import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { MarketSessions } from "@core/enums/marketSessions.enum";
import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { buildMarketQuoteFetcherFromKeys } from "@strategies/fetch/factories/buildMarketQuoteFetcherFromKeys";
import { SnapshotScreener } from "./SnapshotScreener";
import { PriceChangeScanFilter, VolumeChangeScanFilter } from "./scanFilters";

export interface MarketQuoteScannerConfig {
	vendor: MarketDataVendors;
	marketSession: MarketSessions;
	strategyKeys: string[];
}

export class MarketQuoteScanner {
	constructor(private readonly config: MarketQuoteScannerConfig) {}

	private logResults(tickers: NormalizedRestTickerSnapshot[]): void {
		if (!tickers.length) {
			console.log("⚠️ No active tickers found.");
			return;
		}

		console.log(`✅ Found ${tickers.length} active tickers:`);
		for (const t of tickers) {
			console.log(`→ ${t.ticker} | Δ ${t.change_pct}% | Volume: ${t.volume ?? "?"}`);
		}
	}

	async executeScan(): Promise<NormalizedRestTickerSnapshot[]> {
		const marketSession = this.config.marketSession;

		try {
			const fetcher = buildMarketQuoteFetcherFromKeys(this.config.vendor, this.config.strategyKeys);

			const rawData = await fetcher.getData(marketSession);

			// TODO - pass the screener and options into the executeScan() mtd.
			const screener = new SnapshotScreener([
				{
					scanFilter: new VolumeChangeScanFilter(),
					config: { volumeThreshold: 1_000_000, changePercentageThreshold: 3 },
				},
				{
					scanFilter: new PriceChangeScanFilter(),
					config: { minPriceJump: 2.5 },
				},
			]);

			const filtered = screener.runScreener(rawData);

			this.logResults(filtered);
			return filtered;
		} catch (err) {
			console.error("❌ MarketQuoteScanner failed:", err);
			throw err;
		}
	}
}
