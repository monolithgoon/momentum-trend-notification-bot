import {
	applyNormalization,
	DEFAULT_NORMALIZATION,
	IScalarPoint,
	precomputeBasic,
	precomputeSorted,
} from "@analytics/math/normalization";
import { sanitizeValue } from "@core/utils/number";
import { FIELD_KEYS, SnapshotMetricFieldKeyType } from "../kinetics/config/KineticsFieldBindings";
import {
	IKineticsByMetricMap,
	IKineticsBySpanMap,
	MomentumComputationSpec,
	MomentumSignalsBySpan,
} from "../kinetics/types/KineticsComputeSpecTypes";

/* ============================================================================
	 Computes momentum scores per horizon span using velocity and acceleration.

	 ⚙️ Semantic Policy:
	 - Each span represents a different lookback horizon (e.g., 3, 5, 10 intervals)
	 - Velocity = rate of change over the horizon
	 - Acceleration = second derivative (change in velocity)
	 - Boosts combine both metrics to derive "momentum"

	 🧠 Why this exists:
	 - To translate raw velocity/acceleration into a synthetic momentum signal
	 - Allows span-wise comparison (with optional normalization)
	 - Designed to be extensible via strategy configs and plug-and-play math modules

		Supports:
   - Optional normalization across spans (via @analytics/math/normalization)
   - Defensive sanitization (via @core/utils/number)
============================================================================ */

/* ----------------------------------------------------------------------------
   🧠 Main Entry: Computes momentum signals across all horizon lookback spans
	 - Accepts velocity/acceleration data grouped by metric + span
	 - Applies normalization if enabled
	 - Boosts each pair (price, volume) and optionally acceleration
	 - Outputs momentum scores by span
---------------------------------------------------------------------------- */

/**
 * @param kineticsData Example:
	 kineticsData = {
		 price_pct_change: {
			 3: { velocity: 0.1, acceleration: 0.05 },
			 5: { velocity: 0.2, acceleration: 0.1 },
		 },
		 volume_change: {
			 3: { velocity: 0.05, acceleration: 0.02 },
			 5: { velocity: 0.1, acceleration: 0.03 },
		 }
	 }

	 @param momoComputeSpec Example:
	 {
	   normalizeChk: true,
	   priceWeight: 1,
	   volumeWeight: 1,
	   includeAccelerationChk: true,
	   boostFormula: (v, a) => v + 0.5 * a
	 }
 */
export function computeMomentumSignalsStage(
	kineticsData: IKineticsByMetricMap,
	momoComputeSpec: MomentumComputationSpec
): MomentumSignalsBySpan {
	const {
		normalizeChk = false,
		priceWeight = 1,
		volumeWeight = 1,
		includeAccelerationChk = false,
		boostFormula = (v, a) => v * a,
	} = momoComputeSpec;

	const priceKey = FIELD_KEYS.METRIC_FIELDS.PRICE_PCT_CHANGE satisfies SnapshotMetricFieldKeyType;
	const volumeKey = FIELD_KEYS.METRIC_FIELDS.VOLUME_CHANGE satisfies SnapshotMetricFieldKeyType;

	const priceMap = kineticsData[priceKey];
	const volumeMap = kineticsData[volumeKey];
	if (!priceMap || !volumeMap) return {};

	const spans = Object.keys(priceMap)
		.map(Number)
		.sort((a, b) => a - b);
	const output: MomentumSignalsBySpan = {};

	/* ----------------------------------------------------------------------------
		 ⚙️ Normalization strategy setup
	---------------------------------------------------------------------------- */

	const normEnabled = !!normalizeChk;
	const normStrategy =
		typeof normalizeChk === "object" && normalizeChk.strategy ? normalizeChk.strategy : DEFAULT_NORMALIZATION;
	const normDirection = typeof normalizeChk === "object" && normalizeChk.direction ? normalizeChk.direction : "asc";

	const seriesCache = buildNormalizationCache(priceMap, volumeMap, includeAccelerationChk);

	/* ----------------------------------------------------------------------------
	   🔁 Core Computation: Loop through and calculate score for each horizon span
	---------------------------------------------------------------------------- */

	for (const span of spans) {
		const p = priceMap[span] ?? {};
		const v = volumeMap[span] ?? {};

		let priceVel = sanitizeValue(p.velocity ?? 0);
		let volumeVel = sanitizeValue(v.velocity ?? 0);
		let priceAcc = sanitizeValue(p.acceleration ?? 0);
		let volumeAcc = sanitizeValue(v.acceleration ?? 0);

		if (normEnabled) {
			priceVel = normalizeScalar(priceVel, seriesCache.priceVel, normStrategy, normDirection);
			volumeVel = normalizeScalar(volumeVel, seriesCache.volumeVel, normStrategy, normDirection);

			if (includeAccelerationChk) {
				priceAcc = normalizeScalar(priceAcc, seriesCache.priceAcc!, normStrategy, normDirection);
				volumeAcc = normalizeScalar(volumeAcc, seriesCache.volumeAcc!, normStrategy, normDirection);
			}
		}

		let baseMomentum = sanitizeValue(boostFormula(priceVel, volumeVel));
		if (includeAccelerationChk) {
			baseMomentum += sanitizeValue(boostFormula(priceAcc, volumeAcc));
		}

		const momentumScore = sanitizeValue(baseMomentum * priceWeight * volumeWeight);

		/**
		 Example output shape:
			{
				3: {
					span: 3,
					momentumScore: 0.25,
					breakdown: {
						priceVelocity: 0.05,
						priceAcceleration: 0.01,
						volumeVelocity: 1000,
						volumeAcceleration: 300,
						baseMomentum: 0.25,
					}
				},
				...
			}
		*/
		output[span] = {
			span,
			momentumScore,
			breakdown: {
				priceVelocity: priceVel,
				priceAcceleration: priceAcc,
				volumeVelocity: volumeVel,
				volumeAcceleration: volumeAcc,
				baseMomentum,
			},
		};
	}

	return output;
}

/* ----------------------------------------------------------------------------
   📏 Normalization Logic Helpers
---------------------------------------------------------------------------- */

function normalizeScalar(
	value: number,
	series: NormalizationCacheEntry,
	strategy: string,
	direction: "asc" | "desc"
): number {
	return applyNormalization(value, series.series, strategy, {
		...series.stats,
		...series.sorted,
		direction,
	});
}

interface NormalizationCacheEntry {
	series: IScalarPoint[];
	stats: ReturnType<typeof precomputeBasic>;
	sorted: ReturnType<typeof precomputeSorted>;
}

function buildNormalizationCache(
	priceMap: IKineticsBySpanMap,
	volumeMap: IKineticsBySpanMap,
	includeAcc: boolean
): {
	priceVel: NormalizationCacheEntry;
	volumeVel: NormalizationCacheEntry;
	priceAcc?: NormalizationCacheEntry;
	volumeAcc?: NormalizationCacheEntry;
} {
	const priceVelSeries = seriesFromMap(priceMap, "velocity");
	const volumeVelSeries = seriesFromMap(volumeMap, "velocity");

	const cache = {
		priceVel: {
			series: priceVelSeries,
			stats: precomputeBasic(priceVelSeries),
			sorted: precomputeSorted(priceVelSeries),
		},
		volumeVel: {
			series: volumeVelSeries,
			stats: precomputeBasic(volumeVelSeries),
			sorted: precomputeSorted(volumeVelSeries),
		},
	};

	if (includeAcc) {
		const priceAccSeries = seriesFromMap(priceMap, "acceleration");
		const volumeAccSeries = seriesFromMap(volumeMap, "acceleration");

		return {
			...cache,
			priceAcc: {
				series: priceAccSeries,
				stats: precomputeBasic(priceAccSeries),
				sorted: precomputeSorted(priceAccSeries),
			},
			volumeAcc: {
				series: volumeAccSeries,
				stats: precomputeBasic(volumeAccSeries),
				sorted: precomputeSorted(volumeAccSeries),
			},
		};
	}

	return cache;
}

/* ----------------------------------------------------------------------------
   🔧 Utility: Build sanitized scalar series from span maps
---------------------------------------------------------------------------- */

export function seriesFromMap(map: IKineticsBySpanMap | undefined, field: "velocity" | "acceleration"): IScalarPoint[] {
	if (!map) return [];

	return Object.keys(map)
		.map(Number)
		.filter(Number.isFinite)
		.sort((a, b) => a - b)
		.map((span) => {
			const value = map[span]?.[field] ?? 0;
			return { v: sanitizeValue(value) };
		});
}
