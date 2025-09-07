import { SnapshotTimestampFieldKeyType, SnapshotMetricFieldKeyType } from "../config/KineticsFieldBindings";
import { sanitizeValue } from "@core/utils/number";
import { calcOlsSlope } from "../../../math/calcOlsSlope";
import { applyNormalization, NormalizationRegistry, TNormalizationKey } from "@analytics/math/normalization";

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
	//  * Compute the velocity (rate of change) of a numeric field over time.
	//  *
	//  * @param history   - Array of snapshot objects (must have timestamp__ld_tick and the target field)
	//  * @param field     - Name of the numeric field to compute velocity for
	//  * @param numLookbackSnapshots  - Number of most recent snapshots to consider
	//  * @param normalize - Optional normalization strategy name
	//  * @returns         - Velocity (OLS slope) value, normalized if requested
	 */

	computeVelocity_2<TIn extends Record<string, unknown>>(
		history: TIn[],
		metricFieldKey: SnapshotMetricFieldKeyType & keyof TIn, // ensure it's a valid key in TIn
		lookbackSpan: number,
		normalizationStrategy: TNormalizationKey,
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
		const shouldNormalize = normalizationStrategy !== NormalizationRegistry.NONE;
		const velocityResult = shouldNormalize
			? applyNormalization(olsSlopeValue, series, normalizationStrategy)
			: olsSlopeValue;

		return velocityResult;
	}

	/**
	 * Compute acceleration as the slope of velocity over time.
	 * Velocity is defined by computeVelocity_2 (OLS slope of raw metric values).
	 *
	 * @param history   - Array of snapshot objects
	 * @param metricKey - The numeric metric field
	 * @param lookbackSpan - Number of snapshots to use for each velocity calculation
	 * @param normalizationStrategy - Normalization strategy for acceleration
	 * @param timestampFieldKey - The timestamp field
	 * @returns         - Acceleration (OLS slope of velocity series), normalized if requested
	 */
	computeAcceleration_2<TIn extends Record<string, unknown>>(
		history: TIn[],
		metricKey: SnapshotMetricFieldKeyType & keyof TIn,
		lookbackSpan: number,
		normalizationStrategy: TNormalizationKey,
		timestampFieldKey: SnapshotTimestampFieldKeyType & keyof TIn
	): number {
		const tsFieldKey = timestampFieldKey;

		// Build velocity series by sliding a window and computing velocity at each step
		const velocitySeries: { t: number; v: number }[] = [];
		for (let i = lookbackSpan; i <= history.length; i++) {
			const window = history.slice(i - lookbackSpan, i);

			const velocity = this.computeVelocity_2(
				window,
				metricKey,
				lookbackSpan,
				NormalizationRegistry.NONE, // raw slope, no normalization yet
				tsFieldKey
			);

			const t = Number(window[window.length - 1][tsFieldKey]);
			velocitySeries.push({ t, v: velocity });
		}

		// Restrict to last N velocity points (horizon for acceleration)
		const series = velocitySeries.slice(-lookbackSpan);

		// 🔑 Acceleration = OLS slope of velocity vs time
		const olsSlopeValue = calcOlsSlope(series);

		// Normalize acceleration if requested
		return normalizationStrategy !== NormalizationRegistry.NONE
			? applyNormalization(olsSlopeValue, series, normalizationStrategy)
			: olsSlopeValue;
	}
}
