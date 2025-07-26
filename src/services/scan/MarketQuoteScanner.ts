import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { MarketSessions } from "@core/enums/marketSessions.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";
import { ScanScreenerConfigTypes } from "./types/scanScreenerConfigs.type";
import { SnapshotScreener } from "./SnapshotScreener";
import { getMarketQuoteFetcherForStrategies } from "./fetch/factories/getMarketQuoteFetcherForStrategies";

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
			console.log(`→ ${t.ticker_name__nz_tick} | Δ ${t.change_pct__nz_tick}% | Volume: ${t.volume ?? "?"}`);
		}
	}

	async executeScan(screenerConfigs: ScanScreenerConfigTypes[]): Promise<NormalizedRestTickerSnapshot[]> {
		try {
			const fetcher = getMarketQuoteFetcherForStrategies(this.config.vendor, this.config.strategyKeys);

			const marketData = await fetcher.fetchData(this.config.marketSession);

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
