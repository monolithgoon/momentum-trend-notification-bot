/** EmitStage — publish a compact update */
import type { Stage } from "../PipelineEngine";
import type { PipelineContext } from "../types";
import type { Logger } from "../ports/Logger";
export class EmitStage implements Stage {
  name = "emit";
  constructor(private readonly log: Logger) {}
  async run(ctx: PipelineContext): Promise<PipelineContext> {
    const top = ctx.leaderboard?.[0]?.ticker_symbol__ld_tick ?? null;
    this.log.info("[emit] leaderboard update", { tag: ctx.tag, total: ctx.leaderboard?.length ?? 0, topTicker: top });
    return ctx;
  }
}
