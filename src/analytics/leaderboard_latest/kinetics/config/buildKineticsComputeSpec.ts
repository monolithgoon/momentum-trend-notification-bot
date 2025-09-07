import { NormalizationRegistry } from "@analytics/math/normalization";
import {
	IKineticsHorizon,
	IPerMetricComputePlanSpec,
	IPipelineComputePlanSpec,
} from "../types/KineticsComputeSpecTypes";
import { assertIdenticalLookbackPlans } from "./assertIdenticalLookbackPlans";
import { FIELD_KEYS } from "./KineticsFieldBindings";

export function buildKineticsComputeSpec_3(): IPipelineComputePlanSpec {
	// Define default horizons for all metrics
	const defaultHorizons: IKineticsHorizon[] = [];
	const perMetricPlans: IPerMetricComputePlanSpec[] = [
		{
			metricFieldKey: FIELD_KEYS.METRIC_FIELDS.PRICE_PCT_CHANGE,
			enableVelocityGuard: true,
			minVelocity: 0.02,
			horizons: [
				{ lookbackSpan: 3, normalizeStrategy: NormalizationRegistry.NONE },
				{ lookbackSpan: 5, normalizeStrategy: NormalizationRegistry.Z_SCORE },
				{ lookbackSpan: 8, normalizeStrategy: NormalizationRegistry.Z_SCORE },
				{ lookbackSpan: 20, normalizeStrategy: NormalizationRegistry.NONE },
			],
		},
		{
			metricFieldKey: FIELD_KEYS.METRIC_FIELDS.VOLUME_CHANGE,
			enableVelocityGuard: false,
			minVelocity: 0,
			horizons: [
				{ lookbackSpan: 3, normalizeStrategy: NormalizationRegistry.NONE },
				{ lookbackSpan: 5, normalizeStrategy: NormalizationRegistry.Z_SCORE },
				{ lookbackSpan: 8, normalizeStrategy: NormalizationRegistry.Z_SCORE },
				{ lookbackSpan: 20, normalizeStrategy: NormalizationRegistry.NONE },
			],
		},
	];

	// Validate uniform lookback spans across all metrics
	assertIdenticalLookbackPlans(perMetricPlans);

	return {
		perMetricPlans,
		defaultHorizons,
	};
}


