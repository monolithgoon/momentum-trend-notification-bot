import { FIELD_KEYS } from "@analytics/leaderboard_latest/kinetics/config/KineticsFieldBindings";
import { IKineticsConfigSpec } from "../stages/kinetics/types/KineticsConfig.interface";
import { NormalizationRegistry } from "@analytics/math/normalization/strategies";

export const DEFAULT_KINETICS_SPEC: IKineticsConfigSpec = {
	horizons: {
		3: NormalizationRegistry.Z_SCORE,
		5: NormalizationRegistry.Z_SCORE,
		8: NormalizationRegistry.NONE,
		20: NormalizationRegistry.ROBUST_Z,
	},
	metrics: {
		price: {
			key: FIELD_KEYS.METRIC_FIELDS.PRICE_PCT_CHANGE,
			enableVelocityGuard: true,
			minVelocity: 0.02,
		},
		volume: {
			key: FIELD_KEYS.METRIC_FIELDS.VOLUME_CHANGE,
			enableVelocityGuard: false,
		},
	},
	velNormStrat: NormalizationRegistry.NONE,
	accelNormStrat: NormalizationRegistry.NONE,
	weights: { price: 1, volume: 1 },
	includeAcceleration: true,
};
