/** ComputeSignalsStage — compute kinetics & mark warm-up */
import type { Stage } from "../PipelineEngine";
import type { PipelineContext, Snapshot, Enriched } from "../types";
import type { Logger } from "../ports/Logger";
import type { DerivativeStrategy } from "../strategies/derivatives/IndexBasedDerivative";
export type ComputeCfg = {
  velWindowSamples: number;
  accWindowSamples: number;
  minSamplesForAccel: number;
  appendCurrentIfMissing?: boolean;
};
export class ComputeSignalsStage implements Stage {
  name = "compute_signals";
  constructor(
    private readonly deriv: DerivativeStrategy,
    private readonly cfg: ComputeCfg,
    private readonly log: Logger
  ) {}
  private toTail(history: Snapshot[] | undefined, current: Snapshot): Snapshot[] {
    const h = (history ?? []).slice();
    if (this.cfg.appendCurrentIfMissing !== false) {
      const lastTs = h[h.length - 1]?.timestamp__ld_tick;
      if (lastTs == null || lastTs < current.timestamp__ld_tick) h.push(current);
    }
    return h;
  }
  async run(ctx: PipelineContext): Promise<PipelineContext> {
    const enriched = new Map<string, Enriched>();
    for (const snap of ctx.batch) {
      const tail = this.toTail(ctx.historyBySymbol?.[snap.ticker_symbol__ld_tick], snap);
      if (tail.length < this.cfg.minSamplesForAccel) {
        enriched.set(snap.ticker_symbol__ld_tick, {
          ...snap,
          pct_change_velocity__ld_tick: 0,
          pct_change_acceleration__ld_tick: 0,
          volume_velocity__ld_tick: 0,
          volume_acceleration__ld_tick: 0,
          warming_up__ld_tick: true,
        });
        continue;
      }
      const pctVel = this.deriv.velocity(tail, this.cfg.velWindowSamples);
      const pctAcc = this.deriv.acceleration(tail, this.cfg.velWindowSamples);
      const volTail = tail.map(s => ({ ...s, pct_change__ld_tick: s.volume__ld_tick } as Snapshot));
      const volVel = this.deriv.velocity(volTail, this.cfg.velWindowSamples);
      const volAcc = this.deriv.acceleration(volTail, this.cfg.velWindowSamples);
      enriched.set(snap.ticker_symbol__ld_tick, {
        ...snap,
        pct_change_velocity__ld_tick: pctVel,
        pct_change_acceleration__ld_tick: pctAcc,
        volume_velocity__ld_tick: volVel,
        volume_acceleration__ld_tick: volAcc,
        warming_up__ld_tick: false,
      });
    }
    return { ...ctx, enrichedBySymbol: enriched };
  }
}
