/* ============================================================================
   src/analytics/types.ts

   Unified types for Kinetics + Momentum computation.
   - Purely declarative (no value imports or logic)
   - Clean separation between domains
   - Imports only type-level dependencies
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

export type Span = number;
export type Direction = "asc" | "desc";

/** Minimal scalar point used by normalization/ranking utilities. */
export interface ScalarPoint {
	v: number;
}

/* ============================================================================
   📈 MOMENTUM DOMAIN TYPES
============================================================================ */

/** A computed momentum vector at a single span. */
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

// REMOVE - DEPRECATED
/** Final momentum signal output for all spans. */
export type MomentumSignalsBySpan = Record<Span, MomentumVector>;

// REMOVE - DEPRECATED
/** Strategy config for computing momentum. */
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

	/** Weights applied to price and volume components. */
	priceWeight?: number;
	volumeWeight?: number;

	/** Include acceleration in the momentum computation. */
	includeAccelerationChk?: boolean;

	/** Velocity/acceleration combination logic. */
	boostFormula?: (velocity: number, acceleration: number) => number;

	/** Field keys used to extract base metrics from the snapshot. */
	baseMetricKeys: {
		priceMetricKey: SnapshotPctChangeFieldKeyType;
		volumeMetricKey: SnapshotVolumeFieldKeyType;
	};

	// Optional future use: strategy name (if registry applied)
	// momentumStrategyName: MomentumStrategyKey;
}

/* ============================================================================
   ⚙️ MAIN LEADERBOARD KINETICS DOMAIN TYPES
============================================================================ */

/** Represents computed values at a given span. */
export interface IKineticsMetricPoint {
	velocity: number;
	acceleration: number;
}

/** Maps each span to its metric point. */
export type IKineticsBySpanMap = Record<Span, IKineticsMetricPoint>;

/** Maps each metric name (e.g., "price_pct_change") to its span map. */
export type IKineticsByMetricMap = Record<string, IKineticsBySpanMap>;

/** A single horizon definition (lookback + optional normalization). */
export interface IKineticsHorizon {
	lookbackSpan: number;
	normalizeStrategy: TNormalizationKey;
}

/** Optional boost logic for computed velocity + acceleration. */
export interface IKineticsBoostConfig {
	name: string;
	formula: (velocity: number, acceleration: number) => number;
}

/** Configuration for a single metric to compute. */
export interface IPerMetricComputePlanSpec {
	metricFieldKey: SnapshotMetricFieldKeyType;
	enableVelocityGuard: boolean;
	minVelocity: number;
	horizons: IKineticsHorizon[];
	velAccBoostFns?: IKineticsBoostConfig[];
}

/** Full config for running the pipeline across all metrics. */
export interface IPipelineComputePlanSpec {
	perMetricPlans: IPerMetricComputePlanSpec[];
	defaultHorizons?: IKineticsHorizon[];
}