import { IPipelineComputePlanSpec } from "../types/KineticsComputeSpecTypes";
import { NormalizationStrategies } from "../strategies/NormalizationStrategies";
import { KINETICS_STRATEGY_BOOSTS_FNS } from "./BoostFnRegistry";
import { FIELD_KEYS } from "./KineticsFieldBindings";

export function buildKineticsComputeSpec(
	kineticsStrategy: keyof typeof KINETICS_STRATEGY_BOOSTS_FNS
): IPipelineComputePlanSpec {
	const velAccBoostFns = KINETICS_STRATEGY_BOOSTS_FNS[kineticsStrategy];

	return {
		/** Optional - that defines the default lookback windows and normalization strategies */
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
				],
				velAccBoostFns,
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
				velAccBoostFns,
			},
		],
	};
}
