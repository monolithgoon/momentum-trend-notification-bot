// /* ============================================================================
//    🌐 Global Pipeline Types (updated to staged typing)
//    - Single place to re-export stage I/O shapes and lightweight DTOs
//    - Small, explicit, and testable
//    - Aligns with: src/analytics/leaderboard/pipeline/types/*
// ============================================================================ */

// import { IKineticsConfigSpec } from "@analytics/leaderboard_latest/kinetics/types/KineticsComputeSpecTypes";
// import { IPipelineRuntimeCtx } from "../__deprecated__types/PipelineRuntimeCtx.interface";
// import { IKineticsEnvelope, MomentumComputationSpec, MomentumEnvelope } from "../stages/kinetics/types/KineticsComputeSpecTypes";

// /* 🔑 Canonical compute-input (early-stage payload) */
// export type TBaseSnapshot_0 = IKineticsPipelineInput; // input to Kinetics stage

// /* ----------------------------------------------------------------------------
//    🏁 Leaderboard Row (view-model / table row DTO)
// ---------------------------------------------------------------------------- */
// export type TLeaderboardRow = {
// 	symbol: string;
// 	score: number;
// 	rank?: number;
// 	meta?: Record<string, unknown>;
// };



// /* ----------------------------------------------------------------------------
//    🧠 Pipeline Config
//    - Exposed via ctx.config to keep stages pure
// ---------------------------------------------------------------------------- */
// export interface IPipelineConfig extends Record<string, unknown> {
// 	computeSpec: {
// 		kinetics: IKineticsConfigSpec;
// 		momentum?: MomentumComputationSpec; // REMOVE
// 	},
// 	ranking?: {
// 		scoringStrategy?: "sum" | "max" | "latest";
// 		 limit?: number; // cap the number of ranked outputs
// 	};

// 	// REMOVE
// 	// /**
// 	//  * ⚠️ History is needed by the Kinetics stage.
// 	//  * It should contain oldest -> newest snapshots for each symbol.
// 	//  */
// 	// historyBySymbol?: Record<string, ReadonlyArray<TBaseSnapshot_0>>;

// 	/**
// 	 * Optional: select algorithm for velocities/accelerations in Kinetics stage.
// 	 * "DIFF" uses finite differences; "OLS" reserved for slope via regression.
// 	 */
// 	algorithm?: "DIFF" | "OLS";
// }

// /* ----------------------------------------------------------------------------
//    🌍 Global Context
//    - Extend the generic IPipelineRuntimeCtx so stages remain framework-agnostic.
//    - Keep stage inputs/outputs OUT of the context; stages should pass data
//      through their return values (Stage<I,O> contract).
// ---------------------------------------------------------------------------- */
// export interface IPipelineContext extends IPipelineRuntimeCtx {
// 	readonly nowEpochMs?: number;
// 	readonly correlationId: string;
// 	readonly symbolFieldKey: Extract<keyof TBaseSnapshot_0, string>;
// 	readonly timestampFieldKey: Extract<keyof TBaseSnapshot_0, string>;

// 	/** Optional: dry-run flag for tooling */
// 	previewOnly?: boolean;

// 	// Pipeline inputs
// 	incomingBatch?: TBaseSnapshot_0[];
// 	/**
// 	 * ⚠️ History is needed by the Kinetics stage.
// 	 * It should contain oldest -> newest snapshots for each symbol.
// 	 */
// 	historyBySymbol?: Record<string, readonly TBaseSnapshot_0[]>;

// 	// Pipeline stage outputs
// 	kineticsBySymbol?: Map<string, IKineticsEnvelope>;
// 	momentumBySymbol?: Map<string, MomentumEnvelope>;
// 	rankingTable?: TLeaderboardRow[];

// 	/** Config container read by stages (history, algo, ranking, etc.) */
// 	config: IPipelineConfig;
// }

// /* ----------------------------------------------------------------------------
//    ✅ Summary of what changed vs. the old DTO:
//    - TBaseSnapshot_0/TEnriched/etc. now alias the staged types from ../types/Snapshots
//      (PipelineBaseSnapshot, TKineticsSnapshot, KineticsWithStreaks, TRankedSnapshot).
//    - Removed ad-hoc incomingBatch/history fields from the context; use ctx.config.historyBySymbol.
//    - Kept optional IKineticsEnvelope/MomentumEnvelope for higher-level consumers.
//    - PipelineContext extends IPipelineRuntimeCtx (logger/metrics/timing live there).
// ---------------------------------------------------------------------------- */


/* ============================================================================
   🌍 Global Pipeline Context
   ----------------------------------------------------------------------------
   - Execution context shared by all pipeline stages
   - Extends runtime context (logger, metrics, timers)
   - Holds inputs, stage outputs, and shared config
============================================================================ */

import { IPipelineRuntimeCtx } from "../__deprecated__types/PipelineRuntimeCtx.interface";
import { IPipelineConfig } from "../config/PipelineConfig.interface";
import { IKineticsEnvelope } from "../stages/kinetics/types/KineticsComputeResult.type";
import { TKineticsSnapshot, TRankedSnapshot, TStreaksSnapshot, TBaseSnapshot, TEnrichedSnapshot } from "../types/Snapshots.type";
import { TLeaderboardRow } from "../types/LeaderboardRow.type";
import { IMomentumEnvelope } from "../stages/momentum/types/MomentumComputeResult.type";

/* ============================================================================
   🌍 Global Pipeline Context
   - Runtime state container shared across pipeline stages
   - Tracks inputs, outputs, and config
============================================================================ */
export interface IPipelineContext extends IPipelineRuntimeCtx {
  /** Global run metadata */
  readonly nowEpochMs?: number;
  readonly correlationId: string;

  /** Field keys for symbol + timestamp resolution */
  readonly tickerSymbolFieldKey: Extract<keyof TBaseSnapshot, string>;
  readonly timestampFieldKey: Extract<keyof TBaseSnapshot, string>;
  readonly volumeFieldKey: Extract<keyof TBaseSnapshot, string>;

  /** Optional dry-run flag for tooling/testing */
  previewOnly?: boolean;

  /* ---------------- Pipeline inputs ---------------- */
  incomingBatch: TBaseSnapshot[];
  /**
   * History snapshots needed by kinetics stage
   * - oldest → newest ordering required
   */
  historyBySymbol: Record<string, readonly TBaseSnapshot[]>;

  /* ---------------- Stage outputs ---------------- */
//   kineticsBatch?: TKineticsSnapshot[]; // REMOVE
  kineticsBatch?: TEnrichedSnapshot[];
  streaksBatch?: TStreaksSnapshot[];
  rankedBatch?: TRankedSnapshot[];

  kineticsBySymbol?: Map<string, IKineticsEnvelope>;
  momentumBySymbol?: Map<string, IMomentumEnvelope>;
  rankingTable?: TLeaderboardRow[];

  /** Config container shared across all stages */
  config: IPipelineConfig;
}

// GELS
// DUO
// PRSO - PM
// VEEE - PM
// PAPL - PM / EARLY MORNING (late to this trade, caught backside)
// HOUR - EARLY MORNING
// CNF - PH
// CIGL - LATE AFTERNOON / AH