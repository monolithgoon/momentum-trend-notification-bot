/** TrimStage — enforce size cap */
import type { Stage } from "../PipelineEngine";
import type { PipelineContext } from "../types";
export class TrimStage implements Stage {
  name = "trim";
  constructor(private readonly maxLen: number) {}
  async run(ctx: PipelineContext): Promise<PipelineContext> {
    return { ...ctx, leaderboard: (ctx.leaderboard || []).slice(0, this.maxLen) };
  }
}
