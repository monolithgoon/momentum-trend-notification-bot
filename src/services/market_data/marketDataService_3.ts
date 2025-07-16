// src/services/market_data/marketDataService.ts
import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { MarketSessions } from "@core/enums/marketSessions.enum";
import { getCurrentMarketSession } from "@utils/index";
import { InternalTickerSnapshot } from "@core/interfaces/internalTickerSnapshot.interface";
import { buiildMarketDataFetcherFromkeys } from "@strategies/fetch/factories/buildMarketDataFetcherFromKeys";
import { MarketDataScreener } from "@scanners/marketSessionScanner";
import { PriceChangeScanFilter, VolumeChangeScanFilter } from "@strategies/scan/scanFilters";

export interface MarketDataServiceConfig {
	vendor: MarketDataVendors;
	marketSession?: MarketSessions;
	strategyKeys: string[];
}

export class MarketDataService_3 {
	constructor(private readonly config: MarketDataServiceConfig) {}

	private resolveMarketSession(): MarketSessions {
		return this.config.marketSession ?? getCurrentMarketSession();
	}

	private handleResults(tickers: InternalTickerSnapshot[]): void {
		if (!tickers.length) {
			console.log("⚠️ No active tickers found.");
			return;
		}

		console.log(`✅ Found ${tickers.length} active tickers:`);
		for (const t of tickers) {
			console.log(`→ ${t.ticker} | Δ ${t.changePct}% | Volume: ${t.volume ?? "?"}`);
		}
	}

	async runService(): Promise<InternalTickerSnapshot[]> {
		const marketSession = this.resolveMarketSession();

		try {
			const fetcher = buiildMarketDataFetcherFromkeys(this.config.vendor, this.config.strategyKeys);

			const rawData = await fetcher.getData(marketSession);

			const screener = new MarketDataScreener([
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

			this.handleResults(filtered);
			return filtered;
		} catch (err) {
			console.error("❌ MarketDataService failed:", err);
			throw err;
		}
	}
}
