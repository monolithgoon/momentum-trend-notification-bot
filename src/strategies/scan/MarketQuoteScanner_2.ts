import { MarketDataVendors } from "@core/enums/MarketDataVendors.enum";
import { MarketSessions } from "@core/enums/MarketSessions.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";
import { getMarketQuoteFetcherForStrategies } from "../fetch/factories/getMarketQuoteFetcherForStrategies";

export interface MarketQuoteScannerConfig {
  vendor: MarketDataVendors;
  marketSession: MarketSessions;
  strategyKeys: string[];
}

export class MarketQuoteScanner_2 {
  constructor(private readonly config: MarketQuoteScannerConfig) {}

  async executeScan(): Promise<NormalizedRestTickerSnapshot[]> {
    try {
      const fetcher = getMarketQuoteFetcherForStrategies(
        this.config.vendor,
        this.config.strategyKeys
      );

      const marketData = await fetcher.fetchData(this.config.marketSession);
      return marketData;
    } catch (err) {
      console.error("❌ MarketQuoteScanner failed:", err);
      throw err;
    }
  }
}
