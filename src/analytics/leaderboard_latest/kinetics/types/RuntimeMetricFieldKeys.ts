export const TICKER_SYMBOL_FIELD = "ticker_symbol__ld_tick" as const;
export type SymbolFieldKey = typeof TICKER_SYMBOL_FIELD;

export const TIMESTAMP_FIELD = "timestamp__ld_tick" as const;
export type TimestampFieldKey = typeof TIMESTAMP_FIELD;

/** Enumerations for supported metrics in velocity and acceleration computations */
export const METRIC_FIELDS = {
	PRICE_PCT_CHANGE: "pct_change__ld_tick",
	VOLUME_CHANGE: "volume__ld_tick",
} as const;

export const FIELD_KEYS = { TICKER_SYMBOL_FIELD, TIMESTAMP_FIELD, METRIC_FIELDS } as const;

// export type KineticsMetricFieldKeyType = (typeof METRIC_FIELDS)[keyof typeof METRIC_FIELDS];
export type KineticsMetricFieldKeyType = (typeof FIELD_KEYS.METRIC_FIELDS)[keyof typeof FIELD_KEYS.METRIC_FIELDS];

// Legacy enum-like exports (keep existing imports working)
export const KineticsSymbolFieldKey = { TICKER_SYMBOL_FIELD: TICKER_SYMBOL_FIELD } as const;
export const KineticsTimestampFieldKey = { LEADERBOARD_TIMESTAMP: TIMESTAMP_FIELD } as const;
export const KineticsMetricsFieldKeys = METRIC_FIELDS;

