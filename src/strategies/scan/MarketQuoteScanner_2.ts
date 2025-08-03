import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/models/NormalizedRestTickerSnapshot.interface";
import { getMarketQuoteFetcherForStrategies } from "../fetch/factories/getMarketQuoteFetcherForStrategies";

export interface MarketQuoteScannerConfig {
  vendor: MarketDataVendor;
  marketSession: MarketSession;
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
