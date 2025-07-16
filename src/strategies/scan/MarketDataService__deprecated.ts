import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { MarketSessions } from "@core/enums/marketSessions.enum";
import { InternalTickerSnapshot } from "src/data/snapshots/types/internalTickerSnapshot.interface";
import { buildMarketDataFetcher } from "@strategies/fetch/factories/buildMarketDataFetcher";
import { SnapshotScreener } from "./SnapshotScreener";
import { PriceChangeScanFilter, VolumeChangeScanFilter } from "@strategies/scan/scanFilters";
import { getCurrentMarketSession } from "@utils/index";

export interface MarketDataServiceConfig {
	vendor: MarketDataVendors;
	marketSession?: MarketSessions; // optional → fallback to current
}

export class MarketDataService {
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
			const fetcher = buildMarketDataFetcher(this.config.vendor, "Pre-market top movers");

			const sessionMarketData = await fetcher.getData(marketSession);

			const screener = new SnapshotScreener([
				{
					scanFilter: new VolumeChangeScanFilter(),
					config: {
						volumeThreshold: 1_000_000,
						changePercentageThreshold: 3,
					},
				},
				{
					scanFilter: new PriceChangeScanFilter(),
					config: {
						minPriceJump: 2.5,
					},
				},
			]);

			const filteredMarketData = screener.runScreener(sessionMarketData);

			this.handleResults(filteredMarketData);
			return filteredMarketData;
		} catch (err) {
			console.error("❌ MarketDataService failed:", err);
			throw err;
		}
	}
}
