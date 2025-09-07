/* ----------------------------------------------------------------------------
   🔬 Kinetics utils — tiny helpers
---------------------------------------------------------------------------- */

import { TBaseSnapshot } from "../../types/Snapshots.type";
import { PerMetricComputePlan, ResolvedComputePlan } from "./KineticsEngine";
import { IKineticsPoint, TKineticsByMetric } from "./types/KineticsComputeResult.type";
import { TLookbackSpan } from "./types/KineticsComputeSpecTypes";

/* -------------------------------------------------------------------------- */
/* Grouping helpers */
/* -------------------------------------------------------------------------- */
export function groupBySymbol(batch: TBaseSnapshot[]): Record<string, TBaseSnapshot[]> {
  return batch.reduce<Record<string, TBaseSnapshot[]>>((acc, s) => {
    (acc[s.ticker_symbol__ld_tick] ??= []).push(s);
    return acc;
  }, {});
}

/* -------------------------------------------------------------------------- */
/* Time-order helpers */
/* -------------------------------------------------------------------------- */

/** Ensure ascending timestamp order; returns a new array if reordering is needed. */
export function ensureAscByTimestamp<T extends Record<string, unknown>>(history: readonly T[], tsKey: keyof T): T[] {
  if (history.length <= 1) return history.slice();
  const first = Number(history[0][tsKey]);
  const last = Number(history[history.length - 1][tsKey]);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return history.slice();
  if (first <= last) return history.slice();
  return history.slice().sort((a, b) => Number(a[tsKey]) - Number(b[tsKey]));
}

/** Append current snapshot if its timestamp is newer than the last in history. */
export function appendIfNewerThanLast<T extends Record<string, unknown>>(
  ascHistory: readonly T[],
  current: T,
  tsKey: keyof T
): T[] {
  const hasAny = ascHistory.length > 0;
  const lastTs = hasAny ? (ascHistory[ascHistory.length - 1][tsKey] as number | undefined) : undefined;
  const curTs = current[tsKey] as number | undefined;
  if (!hasAny || (curTs != null && lastTs != null && curTs > lastTs)) {
    return [...ascHistory, current];
  }
  return ascHistory.slice();
}

/* -------------------------------------------------------------------------- */
/* Structural helpers (type guards & initializers) */
/* -------------------------------------------------------------------------- */

/** Type guard: checks if snapshot has `derivedProps` */
export function hasDerivedProps<TBase, TOut extends { derivedProps: unknown }>(
  s: TBase | TOut
): s is TOut {
  if (typeof s !== "object" || s === null) return false;
  return "derivedProps" in s;
}

/** Ensure a given metric × span entry exists in the kinetics results. */
export function ensureNodeEntry(
  byMetric: TKineticsByMetric,
  metricKey: string,
  span: TLookbackSpan
): IKineticsPoint {
  if (!byMetric[metricKey]) {
    byMetric[metricKey] = { byLookbackSpan: {} };
  }

  const metricNode = byMetric[metricKey]!;
  if (!metricNode.byLookbackSpan[span]) {
    metricNode.byLookbackSpan[span] = { velocity: 0, acceleration: 0 };
  }

  return metricNode.byLookbackSpan[span]!;
}

/* -------------------------------------------------------------------------- */
/* Plan flattening */
/* -------------------------------------------------------------------------- */

export function buildFlattenedComputePlans(perMetricPlans: PerMetricComputePlan[]): ResolvedComputePlan[] {
  return perMetricPlans.flatMap((m) =>
    m.horizons.map((h) => ({
      metricKey: m.metricFieldKey,
      lookbackSpan: h.lookbackSpan,
      normalizeStrategy: h.normalizeStrategy,
      enableVelocityGuard: !!m.enableVelocityGuard,
      minVelocity: m.minVelocity ?? 0,
      // velAccBoostFns: (m.velAccBoostFns ?? []).map((b) => ({ name: b.name, formula: b.formula })),
    }))
  );
}


// /* ----------------------------------------------------------------------------
//    🔬 Kinetics utils — tiny helpers
// ---------------------------------------------------------------------------- */

// import { TBaseSnapshot } from "../../types/Snapshots.type";
// import { IKineticsPoint, TKineticsByMetric } from "./types/KineticsComputeResultTypes";
// import { TLookbackSpan } from "./types/KineticsComputeSpecTypes";

// export function groupBySymbol(batch: TBaseSnapshot[]): Record<string, TBaseSnapshot[]> {
//   return batch.reduce<Record<string, TBaseSnapshot[]>>((acc, s) => {
//     (acc[s.ticker_symbol__ld_tick] ??= []).push(s);
//     return acc;
//   }, {});
// }

// /* --------------------------------------------------------------------------
//   Type guards & pure helpers
// -------------------------------------------------------------------------- */


// /** Ensure ascending timestamp order; returns a new array if reordering is needed. */
// export function ensureAscByTimestamp<T extends Record<string, unknown>>(history: readonly T[], tsKey: keyof T): T[] {
//   if (history.length <= 1) return history.slice();
//   const first = Number(history[0][tsKey]);
//   const last = Number(history[history.length - 1][tsKey]);
//   if (!Number.isFinite(first) || !Number.isFinite(last)) return history.slice();
//   if (first <= last) return history.slice();
//   return history.slice().sort((a, b) => Number(a[tsKey]) - Number(b[tsKey]));
// }

// /** Append current snapshot if its timestamp is newer than the last in history. */
// export function appendIfNewerThanLast<T extends Record<string, unknown>>(
//   ascHistory: readonly T[],
//   current: T,
//   tsKey: keyof T
// ): T[] {
//   const hasAny = ascHistory.length > 0;
//   const lastTs = hasAny ? (ascHistory[ascHistory.length - 1][tsKey] as number | undefined) : undefined;
//   const curTs = current[tsKey] as number | undefined;
//   if (!hasAny || (curTs != null && lastTs != null && curTs > lastTs)) {
//     return [...ascHistory, current];
//   }
//   return ascHistory.slice();
// }


// // export function ensureNodeEntry<TMetricKey extends string, TSpan extends number>(
// //   kineticsResultsMatrix: TKineticsByMetric<TMetricKey, TSpan>,
// //   metricKey: TMetricKey,
// //   span: TSpan
// // ): IKineticsPoint {
// //   if (!kineticsResultsMatrix[metricKey]) {
// //     kineticsResultsMatrix[metricKey] = { byLookbackSpan: {} as KineticsBySpan<TSpan> } as any;
// //   }
// //   const metricNode = kineticsResultsMatrix[metricKey] as { byLookbackSpan: KineticsBySpan<TSpan> };
// //   if (!metricNode.byLookbackSpan[span]) {
// //     metricNode.byLookbackSpan[span] = { velocity: 0, acceleration: 0 };
// //   }
// //   // Non-null due to initialization above
// //   return metricNode.byLookbackSpan[span]!;
// // }

// /* ============================================================================
//    Visual: Nested Structure of TKineticsByMetric → IKineticsMetricEnvelope
   
//    Purpose:
//    - Guarantee that (metricKey, lookbackSpan) exists in the results.
//    - Always return an initialized { velocity, acceleration, … } object.
//    - Eliminates undefined checks inside the main pipeline loop.

//    Shape:
//    TKineticsByMetric
//    └── "PRICE_PCT_CHANGE" (metricKey)
//        └── byLookbackSpan
//            ├── 3
//            │   └── { velocity: 0.018, acceleration: 0.004, velAccBoostFns? }
//            ├── 5 ◀── ensureNodeEntry will return this node (created if missing)
//            │   └── { velocity: 0, acceleration: 0 }
//            └── 8
//                └── { velocity, acceleration, … }

//    Notes:
//    - The returned node is safe to mutate downstream.
//    - Ensures deterministic structure for every metric × span combination.
// ============================================================================ */

// /* ----------------------------------------------------------------------------
//    ensureNodeEntry
//    - Ensures a given metric × span entry exists in the kinetics results.
//    ---------------------------------------------------------------------------
//    Example:
//    const env: IKineticsEnvelope = { byMetric: {} };
//    const node = ensureNodeEntry(env.byMetric, "pct_change", 3);
//    // node = { velocity: 0, acceleration: 0 }
// ---------------------------------------------------------------------------- */
// export function ensureNodeEntry(
//   byMetric: TKineticsByMetric,
//   metricKey: string,
//   span: TLookbackSpan
// ): IKineticsPoint {
//   if (!byMetric[metricKey]) {
//     byMetric[metricKey] = { byLookbackSpan: {} };
//   }

//   const metricNode = byMetric[metricKey]!;
//   if (!metricNode.byLookbackSpan[span]) {
//     metricNode.byLookbackSpan[span] = { velocity: 0, acceleration: 0 };
//   }

//   return metricNode.byLookbackSpan[span]!;
// }


// /** Build flat compute plans from the config (pure). */
// export function buildFlattenedComputePlans(perMetricPlans: PerMetricComputePlan[]): ResolvedComputePlan[] {
//   return perMetricPlans.flatMap((m) =>
//     m.horizons.map((h) => ({
//       metricKey: m.metricFieldKey,
//       lookbackSpan: h.lookbackSpan,
//       normalizeStrategy: h.normalizeStrategy,
//       enableVelocityGuard: !!m.enableVelocityGuard,
//       minVelocity: m.minVelocity ?? 0,
//       velAccBoostFns: (m.velAccBoostFns ?? []).map((b) => ({ name: b.name, formula: b.formula })),
//     }))
//   );
// }
