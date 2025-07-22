import { NormalizedRestTickerSnapshot } from "./NormalizedRestTickerSnapshot.interface";

export interface TaggedNormalizedMarketScanTickers {
  scan_strategy_tag: string;
  normalized_tickers: NormalizedRestTickerSnapshot[];
}