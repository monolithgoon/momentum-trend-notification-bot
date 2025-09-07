import { FIELD_KEYS, SnapshotMetricFieldKeyType } from "@analytics/leaderboard_latest/kinetics/config/KineticsFieldBindings";
import { TNormalizationKey } from "@analytics/math/normalization/strategies";

/**
 * Horizons map: span → normalization strategy.
 * Example: { 3: "Z_SCORE", 5: "Z_SCORE", 20: "NONE" }
 */
export type THorizonConfigSpec = Record<number, TNormalizationKey>;

/**
 * Per-metric configuration.
 */
export interface IMetricConfigSpec {
  key: SnapshotMetricFieldKeyType;
  enableVelocityGuard?: boolean;
  minVelocity?: number;
}

/**
 * Canonical config shape for the kinetics + momentum pipeline.
 */
export interface IKineticsConfigSpec {
  horizons: THorizonConfigSpec;
  metrics: Record<string, IMetricConfigSpec>;
  
  // Momentum-level options
  weights: Record<string, number>; // per-metric weights in momentum score
  includeAcceleration: boolean;    // whether to fold accel into momentum
  boostFormula?: (vel: number, acc: number) => number; // global combiner

  velNormStrat: TNormalizationKey;
  accelNormStrat: TNormalizationKey;
}

/**
 * Default configuration
 */
export const DEFAULT_KINETICS_CONFIG: IKineticsConfigSpec = {
  horizons: {
    3: "NONE",
    5: "Z_SCORE",
    8: "Z_SCORE",
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
  velNormStrat: "NONE",
  accelNormStrat: "NONE",
  weights: {
    price: 1,
    volume: 1,
  },
  includeAcceleration: true,
};
