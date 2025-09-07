import { IKineticsConfigSpec } from "./KineticsConfig.interface";
import {
	FIELD_KEYS,
	SnapshotMetricFieldKeyType,
} from "@analytics/leaderboard_latest/kinetics/config/KineticsFieldBindings";
import { IKineticsComputePlan, IPerMetricComputePlanSpec, IKineticsHorizon } from "./KineticsComputeSpecTypes";

/**
 * Guard: ensure metric key is one of the known FIELD_KEYS.METRIC_FIELDS
 */
function assertMetricKey(key: SnapshotMetricFieldKeyType): SnapshotMetricFieldKeyType {
	const validKeys = Object.values(FIELD_KEYS.METRIC_FIELDS);
	if (!validKeys.includes(key)) {
		throw new Error(`Invalid metricFieldKey: ${key}`);
	}
	return key;
}

/**
 * Build a compute spec consumable by KineticsPipeline_6.
 */
export function buildKineticsComputeSpecFromConfig(cfg: IKineticsConfigSpec): IKineticsComputePlan {
	// Horizons object → array
	const horizons: IKineticsHorizon[] = Object.entries(cfg.horizons).map(([span, normalizeStrategy]) => ({
		lookbackSpan: Number(span),
		normalizeStrategy,
	}));

	// REMOVE
	const widestLookbackSpan = Math.max(...Object.keys(cfg.horizons).map(Number));

	// Metrics object → perMetricPlans
	const perMetricPlans: IPerMetricComputePlanSpec[] = Object.values(cfg.metrics).map((m) => ({
		metricFieldKey: assertMetricKey(m.key),
		enableVelocityGuard: m.enableVelocityGuard ?? false,
		minVelocity: m.minVelocity ?? 0,
		horizons,
	}));

	return {
		perMetricPlans,
		defaultHorizons: horizons,
		// minSnapshotsNeeded: cfg. + 1, // +1 because accel. needs one more than vel. // REMOVE
		momentum: {
			weights: cfg.weights ?? {},
			includeAcceleration: cfg.includeAcceleration ?? true,
			boostFormula: cfg.boostFormula,
		},
	};
}
