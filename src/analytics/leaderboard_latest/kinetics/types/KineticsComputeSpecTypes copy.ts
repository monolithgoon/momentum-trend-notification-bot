/* ============================================================================
	src/analytics/types.ts

	Unified types for Kinetics + Momentum computations (purely declarative).
	- Keeps all logic-free types centralized
	- Helps enforce strict typing across pipeline stages
============================================================================ */

/* ----------------------------------------------------------------------------
	📦 Type-only imports
---------------------------------------------------------------------------- */
import { TNormalizationKey } from "@analytics/math/normalization/strategies";
import type {
	SnapshotMetricFieldKeyType,
	SnapshotPctChangeFieldKeyType,
	SnapshotVolumeFieldKeyType,
} from "../config/KineticsFieldBindings";

/* ----------------------------------------------------------------------------
	🔑 Shared Primitives
---------------------------------------------------------------------------- */

/**
 * Example: `3`, `5`, `8`, etc. — represents a lookback span in snapshots.
 */
export type Span = number;

/**
 * Sort direction for normalization — affects Z_SCORE or RANK result.
 */
export type Direction = "asc" | "desc";

/**
 * Used during normalization — minimal scalar wrapper.
 * Example: [ { v: 0.3 }, { v: 0.5 }, { v: 0.9 } ]
 */
export interface ScalarPoint {
	v: number;
}

/* ============================================================================
	⚙️ KINETICS DOMAIN TYPES
============================================================================ */

/**
 * Result of computing velocity & acceleration for a single span.
 * Example: { velocity: 0.12, acceleration: -0.03 }
 */
export interface IKineticsMetricPoint {
	velocity: number;
	acceleration: number;
}

/**
 * Span → MetricPoint mapping. Used for a single metric (e.g., price).
 * Example:
 * {
 *   3: { velocity: 0.02, acceleration: 0.01 },
 *   5: { velocity: 0.03, acceleration: 0.005 }
 * }
 */
export type IKineticsBySpanMap = Record<Span, IKineticsMetricPoint>;

/**
 * Metric → SpanMap mapping. Top-level output of kinetics stage.
 * Example:
 * {
 *   "price_pct_change": { 3: { ... }, 5: { ... } },
 *   "volume_change":    { 3: { ... }, 5: { ... } }
 * }
 */
export type IKineticsByMetricMap = Record<string, IKineticsBySpanMap>;

/**
 * Lookback period + optional normalization strategy.
 * Example: { lookbackSpan: 5, normalizeStrategy: "z_score" }
 */
export interface IKineticsHorizon {
	lookbackSpan: number;
	normalizeStrategy: TNormalizationKey;
}

/**
 * Optional formula to adjust raw velocity/acceleration components.
 * Example: { name: "momentum_boost", formula: (v, a) => v + a }
 */
export interface IKineticsBoostConfig {
	name: string;
	formula: (velocity: number, acceleration: number) => number;
}

/**
 * Full config to compute kinetics for a single metric field.
 * Example:
 * {
 *   metricFieldKey: "price_pct_change",
 *   enableVelocityGuard: true,
 *   minVelocity: 0.02,
 *   horizons: [
 *     { lookbackSpan: 3, normalizeStrategy: "none" },
 *     { lookbackSpan: 5, normalizeStrategy: "z_score" }
 *   ],
 *   velAccBoostFns: [
 *     { name: "breakout", formula: (v, a) => v * 1.5 + a }
 *   ]
 * }
 */
export interface IPerMetricComputePlanSpec {
	metricFieldKey: SnapshotMetricFieldKeyType;
	enableVelocityGuard: boolean;
	minVelocity: number;
	horizons: IKineticsHorizon[];
	velAccBoostFns?: IKineticsBoostConfig[];
}

/* ============================================================================
	📈 MOMENTUM DOMAIN TYPES
============================================================================ */

/**
 * Output of momentum computation at a single span.
 * Example:
 * {
 *   span: 5,
 *   momentumScore: 0.047,
 *   breakdown: {
 *     priceVelocity: 0.02,
 *     priceAcceleration: 0.01,
 *     volumeVelocity: 0.03,
 *     volumeAcceleration: 0.005,
 *     baseMomentum: 0.031
 *   }
 * }
 */
export interface MomentumVector {
	span: Span;
	momentumScore: number;
	breakdown: {
		priceVelocity: number;
		priceAcceleration: number;
		volumeVelocity: number;
		volumeAcceleration: number;
		baseMomentum: number;
	};
}

/**
 * Full set of momentum vectors keyed by span.
 * Example:
 * {
 *   3: { momentumScore: ..., breakdown: { ... } },
 *   5: { momentumScore: ..., breakdown: { ... } }
 * }
 */
export type MomentumSignalsBySpan = Record<Span, MomentumVector>;

/**
 * Strategy-level configuration for the momentum computation stage.
 * Example:
 * {
 *   normalizeChk: { strategy: "z_score", direction: "asc" },
 *   priceWeight: 1,
 *   volumeWeight: 1,
 *   includeAccelerationChk: true,
 *   boostFormula: (v, a) => v + a,
 *   baseMetricKeys: {
 *     priceMetricKey: "price_pct_change",
 *     volumeMetricKey: "volume_change"
 *   }
 * }
 */
export interface MomentumComputationSpec {
	/**
	 * Enables normalization of momentum inputs across spans.
	 * - If `true`: uses Z_SCORE normalization.
	 * - If object: allows explicit selection of normalization strategy and direction.
	 */
	normalizeChk?:
		| boolean
		| {
				strategy?: TNormalizationKey;
				direction?: Direction;
			};

	/** Multiplier weights applied to price and volume terms. */
	priceWeight?: number;
	volumeWeight?: number;

	/** Whether to include acceleration in the final momentum score. */
	includeAccelerationChk?: boolean;

	/** Custom formula that combines v + a for each component. */
	boostFormula?: (velocity: number, acceleration: number) => number;

	/** Metric keys to extract from snapshot object. */
	baseMetricKeys: {
		priceMetricKey: SnapshotPctChangeFieldKeyType;
		volumeMetricKey: SnapshotVolumeFieldKeyType;
	};
}

/* ============================================================================
	🔗 PIPELINE ROOT SPEC
============================================================================ */

/**
 * Root pipeline config — passed into main compute function.
 * Example:
 * {
 *   perMetricPlans: [ ... ],
 *   momentumStrategySpec: {
 *     priceWeight: 1,
 *     volumeWeight: 1,
 *     baseMetricKeys: {
 *       priceMetricKey: "price_pct_change",
 *       volumeMetricKey: "volume_change"
 *     }
 *   }
 * }
 */
export interface IPipelineComputePlanSpec {
	perMetricPlans: IPerMetricComputePlanSpec[];
	defaultHorizons?: IKineticsHorizon[];
	momentumStrategySpec: MomentumComputationSpec;
}
