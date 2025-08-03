import { LeaderboardRestTickerSnapshot } from "./rest_api/models/LeaderboardRestTickerSnapshot.interface";
import { NormalizedRestTickerSnapshot } from "./rest_api/models/NormalizedRestTickerSnapshot.interface";

// Compile-time utility: Validates that all keys in K exist in T
type ValidateKeys<T, K extends readonly string[]> = K[number] extends keyof T ? true : "❌ Invalid field in array";

// WIP -> Stricter version (WIP): Ensures no extra or missing keys
type StrictValidateKeys<T, K extends readonly (keyof T)[]> = Exclude<keyof T, K[number]> extends never
	? K[number] extends keyof T
		? true
		: "❌ Invalid field in array"
	: "❌ Extra keys not present in type";

/* ============================================================================
   LEADERBOARD SORT FIELD TYPES & VALIDATION
============================================================================ */

// List of valid leaderboard sort fields (kept in one place)
export const LEADERBOARD_SORT_FIELDS = [
	"leaderboard_momentum_score",
	"pct_change_velocity__ld_tick",
	"pct_change_acceleration__ld_tick",
	"volume_velocity__ld_tick",
	"volume_acceleration__ld_tick",
] as const;

// Compile-time assertion: Ensures all LEADERBOARD_SORT_FIELDS are valid keys
export type AssertLeaderboardSortFieldKeysValid = ValidateKeys<
	LeaderboardRestTickerSnapshot,
	typeof LEADERBOARD_SORT_FIELDS
>;

// Type: Union of all leaderboard sort field names
export type LeaderboardSortFieldType = (typeof LEADERBOARD_SORT_FIELDS)[number];

/* ============================================================================
   NORMALIZED SNAPSHOT SORT FIELD TYPES & VALIDATION
============================================================================ */

// List of valid normalized snapshot sort fields
export const NORMALIZED_SORT_FIELDS = ["change_pct__nz_tick", "volume__nz_tick", "price__nz_tick"] as const;

// Compile-time assertion: Ensures all NORMALIZED_SORT_FIELDS are valid keys
export type AssertNormalizedSortFieldsValid = ValidateKeys<NormalizedRestTickerSnapshot, typeof NORMALIZED_SORT_FIELDS>;

// Type: Union of all normalized sortable field names
export type NormalizedSortableFieldType = (typeof NORMALIZED_SORT_FIELDS)[number];

/* ============================================================================
   DEPRECATED TYPES (for reference, safe to remove)
============================================================================ */

// type LeaderboardSortableField = keyof Pick<
// 	LeaderboardRestTickerSnapshot,
// 	| "leaderboard_momentum_score"
// 	| "pct_change_velocity__ld_tick"
// 	| "pct_change_acceleration__ld_tick"
// 	| "volume_velocity__ld_tick"
// 	| "volume_acceleration__ld_tick"
// >;

// type LeaderboardSortFieldType = Extract<
// 	keyof LeaderboardRestTickerSnapshot,
// 	| "leaderboard_momentum_score"
// 	| "pct_change_velocity__ld_tick"
// 	| "pct_change_acceleration__ld_tick"
// 	| "volume_velocity__ld_tick"
//
