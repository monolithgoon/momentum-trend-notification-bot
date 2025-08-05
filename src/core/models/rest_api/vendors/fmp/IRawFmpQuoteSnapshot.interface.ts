export interface IRawFmpQuoteSnapshot {
  symbol: string;
  price: number;
  volume: number;
  timestamp?: number; // UNIX ms or seconds depending on source
}

export interface IEnrichedRawFmpQuoteSnapshot {
  symbol: string;
  name: string;
  price: number;
  volume: number;
  timestamp?: number;
  change?: number;
  changesPercentage: number | string;
  marketCap?: number;
  // TODO -> Not sure if FMP supports these
  // previousClose?: number;
  // marketCapCurrency?: string
}