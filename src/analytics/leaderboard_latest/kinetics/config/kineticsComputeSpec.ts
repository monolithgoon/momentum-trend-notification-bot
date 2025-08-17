import { FIELD_KEYS } from "../types/RuntimeMetricFieldKeys";
import { IKineticsComputePlanSpec } from "../types/KineticsComputeSpecTypes";
import { NormalizationStrategies } from "../types/NormalizationStrategies";

export const kineticsComputePlanSpec: IKineticsComputePlanSpec = {
	/** Optional */
	// defaultHorizons: [
	// 	{ lookbackSpan: 3, normalizeStrategy: NormalizationStrategies.NONE },
	// 	{ lookbackSpan: 5, normalizeStrategy: NormalizationStrategies.Z_SCORE },
	// 	{ lookbackSpan: 8, normalizeStrategy: NormalizationStrategies.MIN_MAX },
	// ],
	perMetricPlans: [
		{
			metricFieldKey: FIELD_KEYS.METRIC_FIELDS.PRICE_PCT_CHANGE,
			enableVelocityGuard: true,
			minVelocity: 0.02,
			horizons: [
				{ lookbackSpan: 3, normalizeStrategy: NormalizationStrategies.NONE },
				{ lookbackSpan: 5, normalizeStrategy: NormalizationStrategies.Z_SCORE },
				{ lookbackSpan: 8, normalizeStrategy: NormalizationStrategies.MIN_MAX },
			],
			boosts: [
				{
					name: "velocity_boost",
					formula: (vel: number, acc: number) => vel * 1.5 + acc, // example
				},
			],
		},
		{
			metricFieldKey: FIELD_KEYS.METRIC_FIELDS.VOLUME_CHANGE,
			enableVelocityGuard: false,
			minVelocity: 0,
			horizons: [
				{ lookbackSpan: 3, normalizeStrategy: NormalizationStrategies.NONE },
				{ lookbackSpan: 5, normalizeStrategy: NormalizationStrategies.Z_SCORE },
				{ lookbackSpan: 8, normalizeStrategy: NormalizationStrategies.MIN_MAX },
			],
			boosts: [
				{
					name: "momentum_boost",
					formula: (vel: number, acc: number) => vel + acc * 0.2,
				},
			],
		},
	],
} as const;

// export type LookbackType =
//   (typeof kineticsComputePlanSpec)["metricsConfig"][number]["horizons"][number]["lookbackSpan"]; // 3 | 5 | 8 (with `as const`)
