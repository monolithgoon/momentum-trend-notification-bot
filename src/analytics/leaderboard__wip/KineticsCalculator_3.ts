import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { calcOlsSlope } from "./calcOlsSlope";
import { normalizeSeriesValue } from "./normalizeSeriesValue";
import { MultiHorizonKineticsConfigType } from "./MultiHorizonKineticsConfig";
import {
	TimestampFieldMap,
	TimestampFieldType,
	AccelerationCalcFieldMap,
	AccelerationCalcFieldType,
	VelocityCalcFieldMap,
	VelocityCalcFieldType,
} from "./types/snapshotFieldTypeAssertions";

export interface IKineticsCalculator {
	compute(
		ticker: string,
		snapshot: ILeaderboardTickerSnapshot_2,
		config: MultiHorizonKineticsConfigType
	): IKineticsCalculatorResult;
}

/* ============================================================================
   🔹 KineticsCalculatorResult
   ----------------------------------------------------------------------------
   This is the output shape from the calculator:
   - `raw`        → Unnormalized raw slope values
   - `normalized` → Values normalized across tickers (if enabled in config)
   - `velAccBoostFns`     → Ratio metrics that compare short- vs long-term kinetics
============================================================================ */
export interface IKineticsCalculatorResult {
	raw: Record<string, number>;
	normalized: Record<string, number>;
	velAccBoostFns: Record<string, number>;
}

/* ============================================================================
   🔹 KineticsCalculator
   ----------------------------------------------------------------------------
   Stateful class that:
   1. Tracks per-ticker snapshot history
   2. Computes velocity (1st derivative) for multiple lookback snapshot windows
   3. Computes acceleration (2nd derivative) for multiple lookback snapshot windows
   4. Normalizes values if requested in config
   5. Produces "boost" ratios for comparing horizons
============================================================================ */
export class KineticsCalculator_3 {
	/** Map of ticker → array of historical snapshots */
	private historyMap = new Map<string, ILeaderboardTickerSnapshot_2[]>();

	/**
	 * Compute velocity & acceleration metrics for the given ticker snapshot
	 *
	 * @param ticker - Unique ticker symbol (e.g. "AAPL")
	 * @param snapshot - Current leaderboard ticker snapshot
	 * @param config - Multi-horizon kinetics config describing lookback windows
	 */
	compute(
		ticker: string,
		snapshot: ILeaderboardTickerSnapshot_2,
		config: MultiHorizonKineticsConfigType
	): IKineticsCalculatorResult {
		// Ensure ticker history array exists
		if (!this.historyMap.has(ticker)) {
			this.historyMap.set(ticker, []);
		}

		// Push the latest snapshot into history
		const history = this.historyMap.get(ticker)!;
		history.push(snapshot);

		// Containers for computed values
		const raw: Record<string, number> = {};
		const normalized: Record<string, number> = {};
		const velAccBoostFns: Record<string, number> = {};

		/* ------------------------------------------------------------------------
       1️⃣ Compute Velocity
       ------------------------------------------------------------------------
       Velocity is the OLS slope of the actual metric over time.
       For each semantic velocity field type:
       - Resolve the actual snapshot key from VelocityCalcFieldMap
       - Iterate through each lookback config (window)
       - Compute slope via calcOlsSlope()
       - Normalize if requested in config
    ------------------------------------------------------------------------ */
		for (const [fieldType, windows] of Object.entries(config.velocity) as [
			VelocityCalcFieldType,
			(typeof config.velocity)[VelocityCalcFieldType]
		][]) {
			const fieldName = VelocityCalcFieldMap[fieldType];
			for (const w of windows) {
				const label = `${fieldType}_L${w.numLookbackSnapshots}`;
				const slope = calcOlsSlope(history, fieldName, w.numLookbackSnapshots);
				raw[`velocity_${label}`] = slope;
				normalized[`velocity_${label}`] = w.normalize ? normalizeSeriesValue(slope, fieldName, history) : slope;
			}
		}

		/* ------------------------------------------------------------------------
       2️⃣ Compute Acceleration
       ------------------------------------------------------------------------
       Acceleration is the OLS slope of the velocity series (rate-of-change-of-rate-of-change).
       For each semantic acceleration field type:
       - Resolve the actual snapshot key from AccelerationCalcFieldMap
       - Iterate through each lookback config
       - Compute slope via olsSlopeFromVelocity()
       - Normalize if requested in config
    ------------------------------------------------------------------------ */
		for (const [fieldType, windows] of Object.entries(config.acceleration) as [
			AccelerationCalcFieldType,
			(typeof config.acceleration)[AccelerationCalcFieldType]
		][]) {
			const valueField = AccelerationCalcFieldMap[fieldType];

			for (const w of windows) {
				const label = `${fieldType}_L${w.numLookbackSnapshots}`;
				const slope = olsSlopeFromVelocity(
					history,
					valueField,
					TimestampFieldType.LEADERBOARD_TIMESTAMP, // No hardcoded timestamp field
					w.numLookbackSnapshots
				);

				raw[`acceleration_${label}`] = slope;
				normalized[`acceleration_${label}`] = w.normalize
					? normalizeSeriesValue(slope, valueField, history)
					: slope;
			}
		}
		/* ------------------------------------------------------------------------
       3️⃣ Compute Boost Ratios
       ------------------------------------------------------------------------
       Boost ratios compare short-term vs long-term velocities/accelerations.
       Example:
       - priceVelocityBoost = (velocity short) / |velocity long|
       This is a proxy for momentum acceleration potential.
       NOTE: Hardcoded L3 vs L8 here — could be made dynamic from config.
    ------------------------------------------------------------------------ */
		velAccBoostFns["priceVelocityBoost"] =
			(raw[`velocity_${VelocityCalcFieldType.PRICE_PCT_CHANGE}_L3`] ?? 0) /
			Math.abs(raw[`velocity_${VelocityCalcFieldType.PRICE_PCT_CHANGE}_L8`] || 1);

		return { raw, normalized, velAccBoostFns };
	}
}

/* ============================================================================
   🔹 olsSlopeFromVelocity
   ----------------------------------------------------------------------------
   Given a metric field (price change, volume, etc.) and a history array:
   - Derive the velocity series (snapshot-to-snapshot rate of change over time)
   - Apply OLS regression on that series to find acceleration slope
============================================================================ */

/**
 * Compute acceleration as the slope of a velocity series derived from a numeric snapshot field.
 * Uses type-safe mappings for both the value and timestamp fields.
 */
function olsSlopeFromVelocity<T extends Record<string, any>, F extends keyof T>(
	history: T[],
	valueField: F,
	timestampFieldType: TimestampFieldType,
	window: number
): number {
	if (history.length < window + 1) return 0;

	const timestampField = TimestampFieldMap[timestampFieldType];
	const velSeries: { t: number; v: number }[] = [];

	for (let i = 0; i < history.length - 1; i++) {
		const t1 = (history[i][timestampField] as number) / 1000;
		const t2 = (history[i + 1][timestampField] as number) / 1000;
		const v1 = history[i][valueField] as number;
		const v2 = history[i + 1][valueField] as number;
		const dt = t2 - t1;

		if (dt > 0) {
			velSeries.push({ t: t2, v: (v2 - v1) / dt });
		}
	}

	return olsSlopeRaw(velSeries.slice(-window));
}

/* ============================================================================
   🔹 olsSlopeRaw
   ----------------------------------------------------------------------------
   Bare-bones OLS slope implementation.
   - Takes an array of {t, v} points
   - Computes slope m in y = mx + b
============================================================================ */
function olsSlopeRaw(data: { t: number; v: number }[]): number {
	if (data.length < 2) return 0;
	const n = data.length;
	const meanT = data.reduce((s, d) => s + d.t, 0) / n;
	const meanV = data.reduce((s, d) => s + d.v, 0) / n;
	let num = 0,
		den = 0;
	for (const d of data) {
		num += (d.t - meanT) * (d.v - meanV);
		den += (d.t - meanT) ** 2;
	}
	return den === 0 ? 0 : num / den;
}
