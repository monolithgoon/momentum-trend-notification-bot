import { KineticsMetricFieldKeyType } from "./RuntimeMetricFieldKeys";
import { NormalizationStrategies } from "./NormalizationStrategies";

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
	metricFieldKey: KineticsMetricFieldKeyType;

	/** Whether to apply a velocity guard before acceleration. */
	enableVelocityGuard?: boolean;

	/** Minimum velocity threshold for acceleration to be considered valid. */
	minVelocity?: number;

	/** The horizons to calculate for this metric. */
	horizons: IKineticsHorizon[];

	/** Optional boosts to apply after computing velocity and acceleration. */
	boosts?: IKineticsBoostConfig[];
}

/**
 * Root configuration interface for the Kinetics pipeline.
 */
export interface IKineticsComputePlanSpec {
	/** List of metrics to compute. */
	perMetricPlans: IPerMetricComputePlanSpec[];

	/** Optional setting to apply same horizons to all kinetics metric fields. */
	defaultHorizons?: IKineticsHorizon[];
}

/** Runtime wiring for the pipeline: tells it which fields in TIn are the symbol and timestamp. */
export interface IKineticsRuntimeFieldKeys<TIn> {
	/** Snapshot field name holding the symbol/ticker (e.g., "ticker_symbol__ld_tick"). */
	symbolFieldKey: keyof TIn;
	/** Snapshot field name holding the timestamp value (used by the calculator). */
	timestampFieldKey: keyof TIn;
}
