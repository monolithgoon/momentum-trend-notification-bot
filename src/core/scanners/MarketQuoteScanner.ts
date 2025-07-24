import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { MarketSessions } from "@core/enums/marketSessions.enum";
import { NormalizedRestTickerSnapshot } from "@core/data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { buildMarketQuoteFetcherFromKeys } from "@core/strategies/fetch/factories/buildMarketQuoteFetcherFromKeys";
import { SnapshotScreener } from "./SnapshotScreener";
import { scanScreenerConfigTypes } from "./types/scanScreenerConfigs.type";

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
			console.log(`→ ${t.ticker_name__nz_tick} | Δ ${t.change_pct}% | Volume: ${t.volume ?? "?"}`);
		}
	}

	async executeScan(screenerConfigs: scanScreenerConfigTypes[]): Promise<NormalizedRestTickerSnapshot[]> {
		const marketSession = this.config.marketSession;

		try {
			const fetcher = buildMarketQuoteFetcherFromKeys(this.config.vendor, this.config.strategyKeys);

			const marketData = await fetcher.getData(marketSession);

			const screener = new SnapshotScreener(screenerConfigs);

			const filtered = screener.runScreener(marketData);

			this.logResults(filtered);
			return filtered;
		} catch (err) {
			console.error("❌ MarketQuoteScanner failed:", err);
			throw err;
		}
	}
}
