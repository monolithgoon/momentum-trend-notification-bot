/* ============================================================================
   📦 Pipeline Snapshots
   ----------------------------------------------------------------------------
   - Type ladder for snapshots as they flow through the pipeline
   - Start from raw input → enrich step by step → final leaderboard row
============================================================================ */

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

import { IKineticsPipelineInput } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { SnapshotMetricFieldKeyType } from "@analytics/leaderboard_latest/kinetics/config/KineticsFieldBindings";
import {
	ComputedKineticsResultsType,
	HorizonSpanType,
} from "@analytics/leaderboard_latest/kinetics/types/KineticsResultTypes";
import { IMomentumEnvelope } from "../stages/momentum/types/MomentumComputeResult.type";
import { IKineticsEnvelope } from "../stages/kinetics/types/KineticsComputeResult.type";

/* ----------------------------------------------------------------------------
   1️⃣ Base Snapshot (raw feed from REST API)
   🔑 Canonical compute-input (early-stage payload)
---------------------------------------------------------------------------- */
export type TBaseSnapshot = IKineticsPipelineInput; // input to Kinetics stage

/* ----------------------------------------------------------------------------
   2️⃣ After Kinetics Stage
   - Adds velocity/acceleration per metric × horizon
---------------------------------------------------------------------------- */
export type TKineticsSnapshot = TBaseSnapshot & {
	derivedProps: {
		computedKinetics: {
			byMetric: ComputedKineticsResultsType<SnapshotMetricFieldKeyType, HorizonSpanType>;
		};
	};
};

/* ----------------------------------------------------------------------------
   3️⃣ After Streaks Stage
   - Adds counters for consecutive appearances/absences
---------------------------------------------------------------------------- */
export type TStreaksSnapshot = TKineticsSnapshot & {
	first_time_seen_flag: boolean;
	num_consecutive_appearances: number;
	num_consecutive_absences: number;
};

/* ----------------------------------------------------------------------------
   4️⃣ After Rankings Stage
   - Adds per-metric ranks, aggregates, and leaderboard info
---------------------------------------------------------------------------- */
export type TRankedSnapshot = TStreaksSnapshot & {
	rankings: {
		volume_rank: number;
		vol_vel_rank: number;
		vol_acc_rank: number;
		pct_change_rank: number;
		pct_change_vel_rank: number;
		pct_change_acc_rank: number;
	};
	aggregate_kinetics_rank: number;
	leaderboard_momentum_score: number;
	leaderboard_rank: number;
};

/* ----------------------------------------------------------------------------
   🏁 Final Snapshot
   - Aliased for clarity in emit/persistence layers
---------------------------------------------------------------------------- */
export type LeaderboardSnapshot = TRankedSnapshot;

// WIP

export type TEnrichedSnapshot = TBaseSnapshot & {
	derivedProps: {
		computedKinetics?: IKineticsEnvelope;
		computedMomentum?: IMomentumEnvelope;
		// 🚀 later: computedSignals, computedRanks, etc.
	};
};

// WIP
// export type LeaderboardSnapshot = TEnrichedSnapshot;
