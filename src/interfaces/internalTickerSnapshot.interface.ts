export interface InternalTickerSnapshot {
  timestamp: number;
  ticker: string;
  rank: number;
  changePct: number;
  price?: number;
  volume?: number;
}