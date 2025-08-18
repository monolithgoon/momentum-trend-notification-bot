import { SnapshotTimestampFieldKeyType, SnapshotMetricFieldKeyType } from "../config/KineticsFieldBindings";
import { NormalizationStrategies } from "../strategies/NormalizationStrategies";
import { sanitizeValue } from "../utils/guards";
import { calcOlsSlope } from "../utils/math";
import { applyNormalization } from "./applyNormalization";

/* =============================================================================
  🔹 KineticsCalculator
  -----------------------------------------------------------------------------
  Stateless computation engine for velocity & acceleration metrics.

  Purpose:
  --------
  - Computes velocity (1st derivative) and acceleration (2nd derivative)
    for a given numeric field in a series of historical snapshots.

  Policy:
  -------
  - Operates on arrays of snapshots, each containing a timestamp and numeric fields.
  - Velocity is computed as the OLS slope of the metric over time.
  - Acceleration is computed as the OLS slope of the velocity series.
  - Optional normalization can be applied at calculation stage.
============================================================================= */
export class KineticsCalculator {
	/**
	 * Compute the velocity (rate of change) of a numeric field over time.
	 *
	 * @param history   - Array of snapshot objects (must have timestamp__ld_tick and the target field)
	 * @param field     - Name of the numeric field to compute velocity for
	 * @param numLookbackSnapshots  - Number of most recent snapshots to consider
	 * @param normalize - Optional normalization strategy name
	 * @returns         - Velocity (OLS slope) value, normalized if requested
	 */

	computeVelocity_2<TIn extends Record<string, unknown>>(
		history: TIn[],
		metricFieldKey: SnapshotMetricFieldKeyType & keyof TIn, // ensure it's a valid key in TIn
		lookbackSpan: number,
		normalizationStrategy: NormalizationStrategies = NormalizationStrategies.NONE,
		timestampFieldKey: SnapshotTimestampFieldKeyType & keyof TIn
	): number {
		const tsFieldKey = timestampFieldKey;
		const mKey = metricFieldKey;

		const series = history.slice(-lookbackSpan).map((snapshot) => ({
			t: sanitizeValue(Number(snapshot[tsFieldKey])),
			v: sanitizeValue(Number(snapshot[mKey])),
		}));

		// Compute OLS slope
		const olsSlopeValue = calcOlsSlope(series);

		// Normalize if needed
		const shouldNormalize = normalizationStrategy !== NormalizationStrategies.NONE;
		const velocityResult = shouldNormalize
			? applyNormalization(olsSlopeValue, series, normalizationStrategy)
			: olsSlopeValue;

		return velocityResult;
	}

	/**
	 * Compute the acceleration (rate of change of velocity) of a numeric field.
	 *
	 * @param history   - Array of snapshot objects (must have timestamp__ld_tick and the target field)
	 * @param field     - Name of the numeric field to compute acceleration for
	 * @param numLookbackSnapshots  - Number of most recent velocity points to consider
	 * @param normalize - Optional normalization strategy name
	 * @returns         - Acceleration (OLS slope of velocity series), normalized if requested
	 */
	computeAcceleration_2<TIn extends Record<string, unknown>>(
		history: TIn[],
		metricFieldKey: SnapshotMetricFieldKeyType & keyof TIn,
		lookbackSpan: number,
		normalizationStrategy: NormalizationStrategies = NormalizationStrategies.NONE,
		timestampFieldKey: SnapshotTimestampFieldKeyType & keyof TIn,
	): number {
		const tsFieldKey = timestampFieldKey;
		const mKey = metricFieldKey;

		// Build velocity series from raw metric values
		const velocities: { t: number; v: number }[] = [];
		for (let i = 0; i < history.length - 1; i++) {
			const t1 = sanitizeValue(Number(history[i][tsFieldKey]));
			const t2 = sanitizeValue(Number(history[i + 1][tsFieldKey]));
			const v1 = sanitizeValue(Number(history[i][mKey]));
			const v2 = sanitizeValue(Number(history[i + 1][mKey]));

			const dt = sanitizeValue((t2 - t1) / 1000); // convert ms diff to seconds
			if (dt > 0) {
				velocities.push({
					t: t2,
					v: sanitizeValue((v2 - v1) / dt),
				});
			}
		}

		// Slice for lookbackSpan horizon
		const series = velocities.slice(-lookbackSpan);

		// Compute OLS slope
		const olsSlopeValue = calcOlsSlope(series);

		// Normalize if needed
		return normalizationStrategy !== NormalizationStrategies.NONE
			? applyNormalization(olsSlopeValue, series, normalizationStrategy)
			: olsSlopeValue;
	}
}
