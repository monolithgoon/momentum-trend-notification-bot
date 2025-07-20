export interface NormalizedRestTickerSnapshot {
	sort_rank: number;
	timestamp: number;
	ticker: string;
	change_pct: number;
	price?: number;
	volume?: number;
	current_day_stats?: {
		h?: number; // Today's high
		l?: number; // Today's low
	};
}
