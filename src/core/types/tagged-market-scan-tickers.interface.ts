import { NormalizedRestTickerSnapshot } from "./NormalizedRestTickerSnapshot.interface";

export interface TaggedMarketScanTickers {
  scan_strategy_tag: string;
  normalized_tickers: NormalizedRestTickerSnapshot[];
}