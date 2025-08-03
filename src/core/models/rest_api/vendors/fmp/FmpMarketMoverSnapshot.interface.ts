// --- Raw shape from API ---
export interface RawFmpMarketMoverSnapshot {
  symbol: string;
  name: string;
  change: number;
  price: number;
  changesPercentage: string; // e.g. "+8.58%"
  exchange: string;
}