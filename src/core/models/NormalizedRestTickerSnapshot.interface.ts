export interface NormalizedRestTickerSnapshot {
	ordinal_sort_position: number;
	timestamp: number;
	ticker_name__nz_tick: string;
	change_pct__nz_tick: number;
	price?: number;
	volume?: number;
	currnt_day_stats_high?: number; // Today's high
	current_day_stats_low?: number; // Today's low
}
