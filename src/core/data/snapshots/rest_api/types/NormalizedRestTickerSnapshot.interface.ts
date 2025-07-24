export interface NormalizedRestTickerSnapshot {
	ordinal_sort_position: number;
	timestamp: number;
	ticker_name__nz_tick: string;
	change_pct: number;
	price?: number;
	volume?: number;
	current_day_stats?: {
		h?: number; // Today's high
		l?: number; // Today's low
	};
}
