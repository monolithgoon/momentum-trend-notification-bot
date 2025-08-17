// import { kineticsComputePlanSpec } from "../config/kineticsComputeSpec";

// type KCfg = typeof kineticsComputePlanSpec;
// type MetricCfg = KCfg["perMetricPlans"][number];

// type Horizon = MetricCfg["horizons"][number];
// export type HorizonSpanType = Horizon["lookbackSpan"];
// export type HorizonNormalizationType = Horizon["normalizeStrategy"];

// export type ComputedKineticsPropertyType = {
// 	velocity: number;
// 	acceleration: number;
// 	boosts?: Record<string, number>;
// };

// export type ComputedKineticsResultsType<TComputeMetricFieldKey extends string, TLookbackSpan extends number> = Record<
// TComputeMetricFieldKey,
// Partial<Record<TLookbackSpan, ComputedKineticsPropertyType>>
// >;

// // REMOVED - DEPRECATED
// // export type EnrichedSnapshotType<TBase, TComputeMetricFieldKey extends string, TLookbackSpan extends number> = TBase & {
// // 	derivedProps: { computedKinetics: ComputedKineticsResultsType<TComputeMetricFieldKey, TLookbackSpan> };
// // };

// // export type EnrichedSnapshotType_0<
// // 	TBase,
// // 	TComputeMetricFieldKey extends string,
// // 	TLookbackSpan extends number
// // > = TBase & {
// // 	derivedProps: {
// // 		computedKinetics: {
// // 			byMetric: ComputedKineticsResultsType<TComputeMetricFieldKey, TLookbackSpan>;
// // 		};
// // 	};
// // };

// // WIP
// // Per-span object, containing computed velocity, acceleration, and boosts
// export type KineticsBySpan<TLookbackSpan extends number> = Partial<Record<TLookbackSpan, ComputedKineticsPropertyType>>;

// // Per-metric object containing byLookbackSpan
// export type KineticsByMetric<TComputeMetricFieldKey extends string, TLookbackSpan extends number> = Partial<
// 	Record<TComputeMetricFieldKey, { byLookbackSpan: KineticsBySpan<TLookbackSpan> }>
// >;

// // Enriched snapshot → derivedProps.computedKinetics.byMetric[metricKey].byLookbackSpan[span]
// export type EnrichedSnapshotType<TBase, TComputeMetricFieldKey extends string, TLookbackSpan extends number> = TBase & {
// 	derivedProps: {
// 		computedKinetics: {
// 			byMetric: KineticsByMetric<TComputeMetricFieldKey, TLookbackSpan>;
// 		};
// 	};
// };

// // ??????
// // // Back-compat alias
// // export type ComputedKineticsEntryType = ComputedKineticsPropertyType;

// --- Types -------------------------------------------------------------------

import { kineticsComputePlanSpec } from "../config/kineticsComputeSpec";

type KCfg = typeof kineticsComputePlanSpec;
type MetricCfg = KCfg["perMetricPlans"][number];

type Horizon = MetricCfg["horizons"][number];
export type HorizonSpanType = Horizon["lookbackSpan"];
export type HorizonNormalizationType = Horizon["normalizeStrategy"];

export type ComputedKineticsPropertyType = {
  velocity: number;
  acceleration: number;
  boosts?: Record<string, number>;
};

// Per-span map
export type KineticsBySpan<TLookbackSpan extends number> =
  Partial<Record<TLookbackSpan, ComputedKineticsPropertyType>>;

// Per-metric map (nested)
export type KineticsByMetric<
  TComputeMetricFieldKey extends string,
  TLookbackSpan extends number
> = Partial<Record<TComputeMetricFieldKey, { byLookbackSpan: KineticsBySpan<TLookbackSpan> }>>;

// Back-compat alias (now points at the nested shape)
export type ComputedKineticsResultsType<
  TComputeMetricFieldKey extends string,
  TLookbackSpan extends number
> = KineticsByMetric<TComputeMetricFieldKey, TLookbackSpan>;

// Enriched snapshot → derivedProps.computedKinetics.byMetric[metricKey].byLookbackSpan[span]
export type EnrichedSnapshotType<
  TBase,
  TComputeMetricFieldKey extends string,
  TLookbackSpan extends number
> = TBase & {
  derivedProps: {
    computedKinetics: {
      byMetric: ComputedKineticsResultsType<TComputeMetricFieldKey, TLookbackSpan>;
    };
  };
};
