/** PruneStage — apply removal policy */
import type { Stage } from "../PipelineEngine";
import type { PipelineContext } from "../types";
export class PruneStage implements Stage {
  name = "prune";
  async run(ctx: PipelineContext): Promise<PipelineContext> {
    return { ...ctx, leaderboard: Array.from(ctx.enrichedBySymbol?.values() || []) };
  }
}
