/** MergeStage — combine current batch with prior leaderboard */
import type { Stage } from "../PipelineEngine";
import type { PipelineContext, Enriched } from "../types";
export class MergeStage implements Stage {
  name = "merge";
  async run(ctx: PipelineContext): Promise<PipelineContext> {
    const current = new Map<string, Enriched>();
    (ctx.leaderboard || []).forEach(s => current.set(s.ticker_symbol__ld_tick, s));
    (ctx.enrichedBySymbol || new Map()).forEach((s, k) => current.set(k, s));
    return { ...ctx, leaderboard: Array.from(current.values()) };
  }
}
