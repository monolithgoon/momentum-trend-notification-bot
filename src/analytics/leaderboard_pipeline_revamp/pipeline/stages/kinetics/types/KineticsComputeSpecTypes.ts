import { SnapshotMetricFieldKeyType } from "@analytics/leaderboard_latest/kinetics/config/KineticsFieldBindings";
import { TNormalizationKey } from "@analytics/math/normalization/strategies";

/* ----------------------------------------------------------------------------
   Shared helpers
---------------------------------------------------------------------------- */
export type TLookbackSpan = number;
export type Direction = "asc" | "desc";

/* ============================================================================
   🔧 SPEC / CONFIG TYPES
   - Definitions for horizons, per-metric plans, and pipeline compute specs
============================================================================ */

/** A single horizon definition (lookback + normalization). */
export interface IKineticsHorizon {
	lookbackSpan: TLookbackSpan;
	normalizeStrategy: TNormalizationKey;
}

/** Config for a single metric in the kinetics pipeline. */
export interface IPerMetricComputePlanSpec {
	metricFieldKey: SnapshotMetricFieldKeyType;
	enableVelocityGuard: boolean;
	minVelocity: number;
	horizons: IKineticsHorizon[];
}

/** Extended compute spec (kinetics + momentum). */
export interface IKineticsComputePlan {
	perMetricPlans: IPerMetricComputePlanSpec[];
	defaultHorizons?: IKineticsHorizon[];
  // minSnapshotsNeeded: number,

	/** Momentum-level configuration applied across metrics */
	momentum: {
		weights: Record<string, number>;
		includeAcceleration: boolean;
		boostFormula?: (vel: number, acc: number) => number;
	};
}
