export interface RawFmpQuoteSnapshot {
  symbol: string;
  price: number;
  volume: number;
  timestamp?: number; // UNIX ms or seconds depending on source
}
