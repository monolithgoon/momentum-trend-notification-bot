import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/LeaderboardRestTickerSnapshot.interface";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";

/* ============================================================================
   🔹 Compile-time utilities
   ----------------------------------------------------------------------------
   These helpers provide **type-level guarantees** that field arrays match the
   keys of the interfaces they’re meant to validate.
   - `ValidateKeys` is used purely for type-checking.
   - `assertFieldArray` ensures our arrays keep literal string types instead 
     of collapsing to `string[]`, which preserves strong type inference.
============================================================================ */

type ValidateKeys<T, K extends readonly string[]> = K[number] extends keyof T ? true : "❌ Invalid field in array";

// Ensures your arrays are typed as readonly arrays of specific string literals, 
// improving type safety, autocomplete, and error checking.
function assertFieldArray<T extends string>(arr: readonly T[]): readonly T[] {
	return arr;
}

/* ============================================================================
   🔹 Velocity & Acceleration Field Enums
   ----------------------------------------------------------------------------
   These enums represent **semantic field types** for kinetics calculations.
   At runtime, they are mapped to actual snapshot field names via the maps
   `VelocityCalcFieldMap` and `AccelerationCalcFieldMap` (see below).
============================================================================ */

export enum VelocityCalcFieldType {
	PRICE_PCT_CHANGE = "PRICE_PCT_CHANGE", // Based on percentage price change
	VOLUME_CHANGE = "VOLUME_CHANGE", // Based on traded volume change
}

export enum AccelerationCalcFieldType {
	PRICE_PCT_CHANGE = "PRICE_PCT_CHANGE", // Acceleration of price change
	VOLUME_CHANGE = "VOLUME_CHANGE", // Acceleration of volume change
}

export enum TimestampFieldType {
	LEADERBOARD_TIMESTAMP = "LEADERBOARD_TIMESTAMP", // Timestamp for leaderboard snapshots
}

/**
 * Mapping from semantic VelocityCalcFieldType → actual snapshot field
 * Used to retrieve the correct numeric value from ILeaderboardTickerSnapshot
 */
export const TimestampFieldMap: Record<TimestampFieldType, keyof LeaderboardRestTickerSnapshot> = {
	[TimestampFieldType.LEADERBOARD_TIMESTAMP]: "timestamp__ld_tick",
};

/**
 * Mapping from semantic VelocityCalcFieldType → actual snapshot field
 * Used to retrieve the correct numeric value from ILeaderboardTickerSnapshot
 */
export const VelocityCalcFieldMap: Record<VelocityCalcFieldType, keyof LeaderboardRestTickerSnapshot> = {
	[VelocityCalcFieldType.PRICE_PCT_CHANGE]: "pct_change__ld_tick",
	[VelocityCalcFieldType.VOLUME_CHANGE]: "volume__ld_tick",
};

/**
 * Mapping from semantic AccelerationCalcFieldType → actual snapshot field
 * Used to retrieve the correct numeric value from ILeaderboardTickerSnapshot
 */
export const AccelerationCalcFieldMap: Record<AccelerationCalcFieldType, keyof LeaderboardRestTickerSnapshot> = {
	[AccelerationCalcFieldType.PRICE_PCT_CHANGE]: "pct_change__ld_tick",
	[AccelerationCalcFieldType.VOLUME_CHANGE]: "volume__ld_tick",
};

/* ============================================================================
   🔹 Leaderboard Sort Fields
   ----------------------------------------------------------------------------
   These are the **main fields used for sorting leaderboard entries**.  
   They are validated against `LeaderboardRestTickerSnapshot` to ensure no 
   typos or stale field names make it into production.
============================================================================ */

export const LEADERBOARD_SORT_FIELDS = assertFieldArray([
	"leaderboard_momentum_score",
	"pct_change_velocity__ld_tick",
	"pct_change_acceleration__ld_tick",
	"volume_velocity__ld_tick",
	"volume_acceleration__ld_tick",
] as const);

export type AssertLeaderboardSortFieldKeysValid = ValidateKeys<
	LeaderboardRestTickerSnapshot,
	typeof LEADERBOARD_SORT_FIELDS
>;

export type LeaderboardSortFieldType = (typeof LEADERBOARD_SORT_FIELDS)[number];

/* 
  Alternate set of leaderboard fields used by a **different ranking strategy** 
  (Leaderboard v2). These might prioritize raw volume or percent change over 
  derived kinetics values.
*/
export const LEADERBOARD_SORT_FIELDS_2 = assertFieldArray([
	"leaderboard_momentum_score",
	"volume__ld_tick",
	"pct_change__ld_tick",
	"aggregate_kinetics_rank",
	"first_time_seen_flag",
] as const);

export type AssertLeaderboardSortFieldKeysValid_2 = ValidateKeys<
	ILeaderboardTickerSnapshot_2,
	typeof LEADERBOARD_SORT_FIELDS_2
>;

export type LeaderboardSortFieldType_2 = (typeof LEADERBOARD_SORT_FIELDS_2)[number];

/* ============================================================================
   🔹 Normalized Snapshot Sort Fields
   ----------------------------------------------------------------------------
   These fields exist on **normalized API snapshots** before they are enriched 
   into leaderboard snapshots. This ensures we can sort/filter early in the 
   pipeline without relying on leaderboard-specific fields.
============================================================================ */

export const NORMALIZED_SORT_FIELDS = assertFieldArray([
	"change_pct__nz_tick",
	"volume__nz_tick",
	"price__nz_tick",
] as const);

export type AssertNormalizedSortFieldsValid = ValidateKeys<NormalizedRestTickerSnapshot, typeof NORMALIZED_SORT_FIELDS>;

export type NormalizedSortableFieldType = (typeof NORMALIZED_SORT_FIELDS)[number];

/* ============================================================================
   🔹 Raw Snapshot Kinetics Field Names
   ----------------------------------------------------------------------------
   These are the actual leaderboard snapshot property names that hold
   calculated velocity and acceleration values.
============================================================================ */

export const VELOCITY_FIELDS = assertFieldArray(["pct_change_velocity__ld_tick", "volume_velocity__ld_tick"] as const);

export type AssertVelocityFieldsValid = ValidateKeys<LeaderboardRestTickerSnapshot, typeof VELOCITY_FIELDS>;

export const ACCELERATION_FIELDS = assertFieldArray([
	"pct_change_acceleration__ld_tick",
	"volume_acceleration__ld_tick",
] as const);

export type AssertAccelerationFieldsValid = ValidateKeys<LeaderboardRestTickerSnapshot, typeof ACCELERATION_FIELDS>;

/* ============================================================================
   🔹 Runtime Validators
   ----------------------------------------------------------------------------
   These are **runtime type guards** so that dynamically provided field names 
   (e.g., from configs or user input) can be validated before use.
============================================================================ */

export function isVelocityField(field: string): field is (typeof VELOCITY_FIELDS)[number] {
	return (VELOCITY_FIELDS as readonly string[]).includes(field);
}

export function isAccelerationField(field: string): field is (typeof ACCELERATION_FIELDS)[number] {
	return (ACCELERATION_FIELDS as readonly string[]).includes(field);
}
