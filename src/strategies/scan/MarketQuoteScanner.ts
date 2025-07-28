import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";
import { ScanFilterConfigTypes } from "./types/ScanFilterConfigs.types";
import { NormalizedSnapshotScreener } from "../filter/NormalizedSnapshotScreener";
import { getMarketQuoteFetcherForStrategies } from "../fetch/factories/getMarketQuoteFetcherForStrategies";

export interface MarketQuoteScannerConfig {
	vendor: MarketDataVendor;
	marketSession: MarketSession;
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

	async executeScan(screenerConfigs: ScanFilterConfigTypes[]): Promise<NormalizedRestTickerSnapshot[]> {
		try {
			const fetcher = getMarketQuoteFetcherForStrategies(this.config.vendor, this.config.strategyKeys);

			const marketData = await fetcher.fetchData(this.config.marketSession);

			const screener = new NormalizedSnapshotScreener(screenerConfigs);

			const filtered = screener.runScreener(marketData);

			this.logResults(filtered);
			return filtered;
		} catch (err) {
			console.error("❌ MarketQuoteScanner failed:", err);
			throw err;
		}
	}
}
