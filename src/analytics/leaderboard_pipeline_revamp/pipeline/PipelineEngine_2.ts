/* ============================================================================
   🚂 Pipeline Engine (with typed contracts)
   ----------------------------------------------------------------------------
   - Works with Stage_4 from your defineStage helper
   - Executes stages sequentially
   - Merges outputs into ctx
   - Logs timing
============================================================================ */

import { Logger_2 } from "@infrastructure/logger";
import { Stage_4 } from "./types/Stage.interface";
import { IPipelineContext } from "./context/PipelineContext.interface";

export class PipelineEngine {
	constructor(private readonly stages: Stage_4<any, any>[], private readonly log: Logger_2) {}

	async run(ctx: IPipelineContext): Promise<IPipelineContext> {
		let curr_ctx = ctx;

		for (const s of this.stages) {
			const t0 = Date.now();

			// Run stage → gets a slice of ctx, returns only its outputs
			const outputs = await s.run(curr_ctx as any);

			// Merge outputs into global context
			curr_ctx = { ...curr_ctx, ...outputs };

			this.log.info(`[stage] ${s.name} ok`, { ms: Date.now() - t0 });
		}

		return curr_ctx;
	}
}

/* ============================================================================
   ⚡ makeEngine
   ----------------------------------------------------------------------------
   - Wires leaderboard pipeline stages into PipelineEngine
   - Stages are defined with `defineStage` for strong contracts
   - Factory returns a ready-to-run engine
============================================================================ */

// Stage definitions (all use defineStage)
// import { PersistHistoryStage } from "../stages/history/PersistHistoryStage";
// import { FetchHistoryStage } from "../stages/history/FetchHistoryStage";
import { ComputeKineticsStage_5 } from "./stages/kinetics/computeKineticsStage";
// import { StreaksStage } from "../stages/streaks/StreaksStage";
// import { RankingStage } from "../stages/ranking/RankingStage";
// import { EmitStage } from "../stages/emit/EmitStage";

/**
 * Create a leaderboard pipeline engine.
 *
 * @param cfg   - pipeline configuration
 * @param ports - infrastructure ports (logger, storage, metrics, etc.)
 */
export function makePipelineEngine(cfg: any, ports: { storage: unknown, logger: Logger_2 }): PipelineEngine {
	const stages = [
		// PersistHistoryStage,
		// FetchHistoryStage,
		ComputeKineticsStage_5,
		// PersistKineticsStage, // TODO
		// StreaksStage,
		// RankingStage,
		// EmitStage,
	];

	return new PipelineEngine(stages, ports.logger);
}
