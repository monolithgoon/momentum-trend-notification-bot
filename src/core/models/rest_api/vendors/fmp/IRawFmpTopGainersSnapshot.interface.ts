// --- Raw shape from API ---
export interface IRawFmpTopGainersSnapshot {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

// --- Envelope for array response ---
export type FmpTopMarketMoversResponse = IRawFmpTopGainersSnapshot[];