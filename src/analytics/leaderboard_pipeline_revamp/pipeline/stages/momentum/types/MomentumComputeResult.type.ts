/* ============================================================================
   📦 MOMENTUM RESULT TYPES
============================================================================ */

import { TLookbackSpan } from "../../kinetics/types/KineticsComputeSpecTypes";

/* ============================================================================
   📦 MOMENTUM RESULT TYPES
============================================================================ */

/* ⚡ Point-level result for a single lookback span */
export interface IMomentumPoint {
  momentum: number;
  force?: number; // optional, enabled by spec.includeForce
}

export type TMomentumBySpan = Record<TLookbackSpan, IMomentumPoint>;

export interface IMomentumMetricEnvelope {
  byLookbackSpan: TMomentumBySpan;
}

export type TMomentumByMetric = Record<string, IMomentumMetricEnvelope>;

/** 🔑 Container for all momentum results on a snapshot */
export interface IMomentumEnvelope {
  byMetric: TMomentumByMetric;
}

/* ----------------------------------------------------------------------------
   ensureMomentumEntry
   - Ensures a given metric × span entry exists in the momentum results.
   ---------------------------------------------------------------------------
   Example:
   const env: IMomentumEnvelope = { byMetric: {} };
   const node = ensureMomentumEntry(env.byMetric, "pct_change", 3);
   // node = { momentum: 0, force: 0 }
---------------------------------------------------------------------------- */
export function ensureMomentumEntry(
  byMetric: TMomentumByMetric,
  metricKey: string,
  span: TLookbackSpan
): IMomentumPoint {
  if (!byMetric[metricKey]) {
    byMetric[metricKey] = { byLookbackSpan: {} };
  }

  const metricNode = byMetric[metricKey]!;
  if (!metricNode.byLookbackSpan[span]) {
    metricNode.byLookbackSpan[span] = {
      momentum: 0,
      force: 0,
    };
  }

  return metricNode.byLookbackSpan[span]!;
}
