import { SnapshotTimestampFieldKeyType, SnapshotMetricFieldKeyType, SnapshotSymbolFieldKeyType } from "../config/KineticsFieldBindings";
import { NormalizationStrategies } from "../strategies/NormalizationStrategies";

// ─────────────────────────────────────────────────────────────────────────────
// Config Types (single source of truth)
// ─────────────────────────────────────────────────────────────────────────────

/** A single computation horizon (lookback span period). */
export interface IKineticsHorizon {
	/** Number of historical snapshots to use for calculation. */
	lookbackSpan: number;

	/** Optional normalization strategy applied to this horizon. */
	normalizeStrategy: NormalizationStrategies;
}

/** Boost formula definition. */
export interface IKineticsBoostConfig {
	/** Name of the boost — used for field mapping in MetricFieldMap. */
	name: string;

	/** Calculation logic for the boost. */
	formula: (velocity: number, acceleration: number) => number;
}

/** Definition of a single metric calculation config. */
export interface IPerMetricComputePlanSpec {
	/** The metric field key to operate on (e.g., PRICE_PCT_CHANGE). */
	metricFieldKey: SnapshotMetricFieldKeyType;

	/** Whether to apply a velocity guard before acceleration. */
	enableVelocityGuard: boolean;

	/** Minimum velocity threshold for acceleration to be considered valid. */
	minVelocity: number;

	/** The horizons to calculate for this metric. */
	horizons: IKineticsHorizon[];

	/** Optional boosts to apply after computing velocity and acceleration. */
	velAccBoostFns?: IKineticsBoostConfig[];
}

/**
 * Root configuration interface for the Kinetics pipeline.
 */
export interface IPipelineComputePlanSpec {
	/** List of metrics to compute. */
	perMetricPlans: IPerMetricComputePlanSpec[];

	/** Optional setting to apply same horizons to all kinetics metric fields. */
	defaultHorizons?: IKineticsHorizon[];
}