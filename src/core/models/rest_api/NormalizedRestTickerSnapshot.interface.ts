import { BaseInternalTickerSnapshot } from "./BaseInternalTickerSnapshot.interface";

export interface NormalizedRestTickerSnapshot extends BaseInternalTickerSnapshot {
	ingestion_ordinal_index: number;
	timestamp__nz_tick: number;
	ticker_name__nz_tick: string; // Normalized ticker symbol, e.g. "AAPL" for Apple Inc.
	ticker_symbol__nz_tick: string;
	change_pct__nz_tick: number;
	change_abs__nz_tick?: number;
	price__nz_tick: number; // Nullable, can be 0
	volume__nz_tick: number; // Nullable, can be 0
	// volume__nz_tick: number | 0; // Nullable, can be 0
	currnt_day_stats_high?: number; // Today's high
	current_day_stats_low?: number; // Today's low
	market_cap__nz_tick?: number; // Nullable, can be 0
	timestamp_utc__nz_tick?: number; // UTC timestamp of the snapshot
	vendor_name__nz_tick?: string; // Vendor name, e.g. "Polygon", "FMP", etc.
	raw_source_snapshot?: Record<string, any>; // Raw snapshot from the vendor
}
