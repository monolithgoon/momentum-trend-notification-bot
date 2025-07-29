import { BaseInternalTickerSnapshot } from "./BaseInternalTickerSnapshot.interface";

export interface NormalizedRestTickerSnapshot extends BaseInternalTickerSnapshot {
	ingestion_ordinal_index: number;
	timestamp: number;
	ticker_name__nz_tick: string;
	change_pct__nz_tick: number;
	price: number | 0; // Nullable, can be 0
	volume: number | 0; // Nullable, can be 0
	// volume__nz_tick: number | 0; // Nullable, can be 0
	currnt_day_stats_high?: number; // Today's high
	current_day_stats_low?: number; // Today's low
}
