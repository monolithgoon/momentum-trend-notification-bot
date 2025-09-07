/* ============================================================================
   📦 KINETICS RESULT TYPES
============================================================================ */

import { TLookbackSpan } from "./KineticsComputeSpecTypes";

/* ----------------------------------------------------------------------------
   ⚡ IKineticsPoint
---------------------------------------------------------------------------- */
export interface IKineticsPoint {
  velocity: number;
  acceleration: number;
  velAccBoostFns?: Record<string, number>; // optional custom boosts
};

export type TKineticsBySpan = Record<TLookbackSpan, IKineticsPoint>;

export interface IKineticsMetricEnvelope {
  byLookbackSpan: TKineticsBySpan;
}

export type TKineticsByMetric = Record<string, IKineticsMetricEnvelope>;

export interface IKineticsEnvelope {
  byMetric: TKineticsByMetric;
}
