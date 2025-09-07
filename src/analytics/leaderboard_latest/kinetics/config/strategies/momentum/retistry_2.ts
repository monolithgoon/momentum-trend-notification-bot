import { MomentumComputationSpec } from "@analytics/leaderboard_latest/kinetics/types/KineticsComputeSpecTypes";
import { FIELD_KEYS, SnapshotMetricFieldKeyType } from "../../KineticsFieldBindings";

// Strict key union
export type MomentumStrategyKey = "default" | "aggressive" | "volume_weighted" | "stability_bias";

type MomentumStrategyFn = (
	priceWeight: number,
	volumeWeight: number,
	includeAccelerationChk: boolean,
	normalizeChk: boolean,
	boostFormula: (value: number, acceleration: number) => number
) => number;

// Shared default metric keys
const baseMetricKeys = {
	priceMetricKey: FIELD_KEYS.METRIC_FIELDS.PRICE_PCT_CHANGE satisfies SnapshotMetricFieldKeyType,
	volumeMetricKey: FIELD_KEYS.METRIC_FIELDS.VOLUME_CHANGE satisfies SnapshotMetricFieldKeyType,
} as const;

/* ============================================================================
   Strategy preset registry (profiles only, no logic).
============================================================================ */
export const MomentumStrategyRegistry: Record<MomentumStrategyKey, MomentumComputationSpec> = {
	default: {
		priceWeight: 1,
		volumeWeight: 1,
		includeAccelerationChk: false,
		normalizeChk: false,
		boostFormula: (v, a) => v * a,
		baseMetricKeys: {
			priceMetricKey: baseMetricKeys.priceMetricKey,
			volumeMetricKey: baseMetricKeys.volumeMetricKey,
		},
	},
	aggressive: {
		priceWeight: 1.2,
		volumeWeight: 1.2,
		includeAccelerationChk: true,
		normalizeChk: false,
		boostFormula: (v, a) => v + a,
		baseMetricKeys: {
			priceMetricKey: baseMetricKeys.priceMetricKey,
			volumeMetricKey: baseMetricKeys.volumeMetricKey,
		},
	},
	volume_weighted: {
		priceWeight: 1,
		volumeWeight: 2,
		includeAccelerationChk: false,
		normalizeChk: false,
		boostFormula: (v, a) => v * a,
		baseMetricKeys: {
			priceMetricKey: baseMetricKeys.priceMetricKey,
			volumeMetricKey: baseMetricKeys.volumeMetricKey,
		},
	},
	stability_bias: {
		priceWeight: 1,
		volumeWeight: 1,
		includeAccelerationChk: true,
		normalizeChk: false,
		boostFormula: (v, a) => (a < 0 ? v * 0.8 : v + a * 0.5),
		baseMetricKeys: {
			priceMetricKey: baseMetricKeys.priceMetricKey,
			volumeMetricKey: baseMetricKeys.volumeMetricKey,
		},
	},
};
