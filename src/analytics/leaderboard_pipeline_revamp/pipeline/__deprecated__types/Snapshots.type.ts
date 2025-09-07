/* ============================================================================
 * Snapshots.ts
 * ----------------------------------------------------------------------------
 * Stage-by-stage snapshot compositions for the pipeline.
 *
 * Design:
 * - Start from a small canonical base shape.
 * - Enrich incrementally per stage using intersections.
 * - End at the final snapshot used for persistence/emit.
 *
 * This file centralizes the composed types so stages import only what they
 * actually need (their input/output contracts), preventing type drift.
 * ========================================================================== */

import type {
  IKineticsComputationFields as PipelineBaseSnapshot,
} from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { KineticsFields } from "./KineticsFields.type";
import { StreakFields } from "./StreakFields.type";
import { RankingFields } from "./RankingFields.type";

/* ----------------------------------------------------------------------------
 * Base (Fetch/Normalize output → Kinetics input)
 * Keep this SMALL and STABLE. This is the canonical compute-input DTO.
 * -------------------------------------------------------------------------- */
export type { PipelineBaseSnapshot };

/* ----------------------------------------------------------------------------
 * After Kinetics stage
 * Adds velocity/acceleration fields.
 * -------------------------------------------------------------------------- */
export type KineticsSnapshot = PipelineBaseSnapshot & KineticsFields;

/* ----------------------------------------------------------------------------
 * After Streaks stage
 * Adds appearance counters and flags.
 * -------------------------------------------------------------------------- */
export type KineticsWithStreaks = KineticsSnapshot & StreakFields;

/* ----------------------------------------------------------------------------
 * After Ranking stage (pre-emit)
 * Adds per-metric ranks and aggregate scores.
 * -------------------------------------------------------------------------- */
export type RankedSnapshot = KineticsWithStreaks & RankingFields;

/* ----------------------------------------------------------------------------
 * Terminal Snapshot
 * Typically equals the project’s “big” persisted shape.
 * Prefer importing the final interface directly from core to avoid duplication.
 * -------------------------------------------------------------------------- */
export type { ILeaderboardTickerSnapshot_2 as LeaderboardSnapshot } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";

/* ----------------------------------------------------------------------------
 * Utility: DeepReadonly (optional)
 * If you want to lock snapshots across the pipeline, you can use this to
 * mark arrays/objects deeply readonly at stage boundaries for extra safety.
 * -------------------------------------------------------------------------- */
export type DeepReadonly<T> =
  T extends (infer U)[] ? ReadonlyArray<DeepReadonly<U>> :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;
