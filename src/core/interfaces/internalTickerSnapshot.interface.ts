export interface InternalTickerSnapshot {
	timestamp: number;
	ticker: string;
	changePct: number;
	price?: number;
	volume?: number;
  currentDayStats?: {
    h?: number; // Today's high
    l?: number; // Today's low
  };
}
