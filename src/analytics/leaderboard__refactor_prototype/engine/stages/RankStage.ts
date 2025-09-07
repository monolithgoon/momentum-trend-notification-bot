/** RankStage — apply ranking strategy */
import type { Stage } from "../PipelineEngine";
import type { PipelineContext } from "../types";
import type { RankingStrategy } from "../strategies/ranking/BasicRanking";
export class RankStage implements Stage {
  name = "rank";
  constructor(private readonly strategy: RankingStrategy) {}
  async run(ctx: PipelineContext): Promise<PipelineContext> {
    const ranked = this.strategy.rank(ctx.leaderboard || []);
    return { ...ctx, leaderboard: ranked };
  }
}
