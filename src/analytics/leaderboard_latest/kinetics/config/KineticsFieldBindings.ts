// export const TICKER_SYMBOL_FIELD = "ticker_symbol__ld_tick" as const;
// export type SymbolFieldKey = typeof TICKER_SYMBOL_FIELD;

// export const TIMESTAMP_FIELD = "timestamp__ld_tick" as const;
// export type TimestampFieldKey = typeof TIMESTAMP_FIELD;

// /** Enumerations for supported metrics in velocity and acceleration computations */
// export const METRIC_FIELDS = {
// 	PRICE_PCT_CHANGE: "pct_change__ld_tick",
// 	VOLUME_CHANGE: "volume__ld_tick",
// } as const;

// export const FIELD_KEYS = { TICKER_SYMBOL_FIELD, TIMESTAMP_FIELD, METRIC_FIELDS } as const;

// // export type SnapshotMetricFieldKeyType = (typeof METRIC_FIELDS)[keyof typeof METRIC_FIELDS];
// export type SnapshotMetricFieldKeyType = (typeof FIELD_KEYS.METRIC_FIELDS)[keyof typeof FIELD_KEYS.METRIC_FIELDS];

// // Legacy enum-like exports (keep existing imports working)
// export const KineticsSymbolFieldKey = { TICKER_SYMBOL_FIELD: TICKER_SYMBOL_FIELD } as const;
// export const KineticsTimestampFieldKey = { LEADERBOARD_TIMESTAMP: TIMESTAMP_FIELD } as const;
// export const KineticsMetricsFieldKeys = METRIC_FIELDS;

// Constants for field names used in snapshot enrichment
export const METRIC_FIELDS = {
	PRICE_PCT_CHANGE: "pct_change__ld_tick",
	VOLUME_CHANGE: "volume__ld_tick",
} as const;

export const TICKER_SYMBOL_FIELD = "ticker_symbol__ld_tick";
export const TIMESTAMP_FIELD = "timestamp__ld_tick";

export const FIELD_KEYS = {
	TICKER_SYMBOL_FIELD,
	TIMESTAMP_FIELD,
	METRIC_FIELDS,
} as const;

/**
 * Extracts a union of the values from METRIC_FIELDS.
 *
 * Given:
 *   export const METRIC_FIELDS = {
 *     PRICE_PCT_CHANGE: "pct_change__ld_tick",
 *     VOLUME_CHANGE: "volume__ld_tick",
 *   } as const;
 *
 * This:
 *   type SnapshotMetricFieldKeyType =
 *     (typeof METRIC_FIELDS)[keyof typeof METRIC_FIELDS];
 *
 * Means:
 *   "Give me the union of values at all keys"
 *   → "pct_change__ld_tick" | "volume__ld_tick"
 */

export type SnapshotSymbolFieldKeyType = (typeof TICKER_SYMBOL_FIELD)[keyof typeof TICKER_SYMBOL_FIELD];
export type SnapshotTimestampFieldKeyType = (typeof TIMESTAMP_FIELD)[keyof typeof TIMESTAMP_FIELD];
export type SnapshotMetricFieldKeyType = (typeof METRIC_FIELDS)[keyof typeof METRIC_FIELDS];
export type SnapshotPctChangeFieldKeyType = (typeof METRIC_FIELDS.PRICE_PCT_CHANGE)[keyof typeof METRIC_FIELDS.PRICE_PCT_CHANGE];
export type SnapshotVolumeFieldKeyType = (typeof METRIC_FIELDS.VOLUME_CHANGE)[keyof typeof METRIC_FIELDS.VOLUME_CHANGE];

// TODO -> use later
// // Runtime keys object used by pipeline
// export interface IKineticsRuntimeFieldKeys<TIn> {
// 	symbolFieldKey: keyof TIn;
// 	timestampFieldKey: keyof TIn;
// 	volumeFieldKey: keyof TIn & (typeof METRIC_FIELDS)["VOLUME_CHANGE"];
// 	pctChangeFieldKey: keyof TIn & (typeof METRIC_FIELDS)["PRICE_PCT_CHANGE"];
// }
