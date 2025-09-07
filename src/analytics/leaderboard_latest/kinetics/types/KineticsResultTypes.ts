/* ============================================================================
   📁 src/analytics/types/KineticsResultTypes.ts

   This file defines the structured types used for representing the output
   of the Kinetics computation pipeline.

   💡 Usage Context:
   These types power the shape of enriched snapshots and allow you to:
   - Traverse per-metric/per-horizon computed velocity and acceleration
   - Lookup computed metrics by lookback span
   - Attach the enriched results directly to snapshot objects

   Includes mock I/O data and usage notes.
============================================================================ */

import { buildKineticsComputeSpec_3 } from "../config/buildKineticsComputeSpec";

/* ----------------------------------------------------------------------------
   🔧 Base Config Type Extraction (from static spec)
---------------------------------------------------------------------------- */

// ✅ Dynamically infer the return shape of your builder function
type KCfg = ReturnType<typeof buildKineticsComputeSpec_3>;
type MetricCfg = KCfg["perMetricPlans"][number];
type Horizon = MetricCfg["horizons"][number];

// 👇 Extracted primitive types
export type HorizonSpanType = Horizon["lookbackSpan"]; // e.g., 3 | 5 | 8
export type HorizonNormalizationType = Horizon["normalizeStrategy"]; // e.g., "z_score" | "rank"

/* ----------------------------------------------------------------------------
   💥 Computed Kinetics Value Object
---------------------------------------------------------------------------- */

/**
 * Represents the core computed properties for a given metric at a single lookback span.
 */
export type ComputedKineticsPropertyType = {
  velocity: number;
  acceleration: number;
  velAccBoostFns?: Record<string, number>; // optional boosts by name
};

/**
 * 🔁 MOCK EXAMPLE:
 * 
 * {
 *   velocity: 0.031,
 *   acceleration: -0.005,
 *   velAccBoostFns: {
 *     velocity_boost: 0.047,
 *     momentum_boost: 0.026
 *   }
 * }
 */

/* ----------------------------------------------------------------------------
   🚀 Boost Function Defs
---------------------------------------------------------------------------- */

/**
 * Defines a named boost function used to modify velocity/acceleration.
 */
export type BoostDef = {
  name: string;
  formula: (v: number, a: number) => number;
};

/* ----------------------------------------------------------------------------
   🧮 Output Mapping Types
---------------------------------------------------------------------------- */

/**
 * Map of lookback spans to computed kinetics.
 *
 * 🔁 MOCK EXAMPLE:
 * {
 *   3: { velocity: 0.03, acceleration: 0.005 },
 *   5: { velocity: 0.02, acceleration: -0.01 },
 *   8: { velocity: 0.015, acceleration: -0.02 }
 * }
 */
export type KineticsBySpan<TLookbackSpan extends number> =
  Partial<Record<TLookbackSpan, ComputedKineticsPropertyType>>;

/**
 * Map of metrics (e.g., "price_pct_change", "volume_change") to their
 * respective per-span results.
 *
 * 🔁 MOCK EXAMPLE:
 * {
 *   price_pct_change: {
 *     byLookbackSpan: {
 *       3: { velocity: 0.03, acceleration: 0.005 },
 *       5: { velocity: 0.02, acceleration: -0.01 }
 *     }
 *   },
 *   volume_change: {
 *     byLookbackSpan: {
 *       3: { velocity: 0.08, acceleration: -0.02 }
 *     }
 *   }
 * }
 */
export type KineticsByMetric<
  TComputeMetricFieldKey extends string,
  TLookbackSpan extends number
> = Partial<Record<TComputeMetricFieldKey, {
  byLookbackSpan: KineticsBySpan<TLookbackSpan>;
}>>;

/* ----------------------------------------------------------------------------
   🧩 Compatibility Alias (used across modules)
---------------------------------------------------------------------------- */

/**
 * Alias to abstract over the full computed result shape.
 */
export type ComputedKineticsResultsType<
  TComputeMetricFieldKey extends string,
  TLookbackSpan extends number
> = KineticsByMetric<TComputeMetricFieldKey, TLookbackSpan>;

/* ----------------------------------------------------------------------------
   🧬 Enriched Snapshot Type
---------------------------------------------------------------------------- */

/**
 * Combines a base snapshot object with enriched derived kinetics results.
 *
 * 🔁 MOCK EXAMPLE:
 * const enriched = {
 *   ...rawSnapshot,
 *   derivedProps: {
 *     computedKinetics: {
 *       byMetric: {
 *         price_pct_change: {
 *           byLookbackSpan: {
 *             5: { velocity: 0.01, acceleration: 0.002 }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */
export type EnrichedSnapshotType<
  TBase,                       // the original snapshot (e.g. raw ticker)
  TComputeMetricFieldKey extends string, // which metrics were computed (keys)
  TLookbackSpan extends number          // which horizons were used
> = TBase & {                           // keep all original props
  derivedProps: {                       // add a dedicated bucket
    computedKinetics: {
      byMetric: ComputedKineticsResultsType<
        TComputeMetricFieldKey,         // map metrics × horizons
        TLookbackSpan
      >;
    };
  };
};
