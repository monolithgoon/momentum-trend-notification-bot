/** FetchHistoryStage — read per-symbol tails from storage */
import type { Stage } from "../PipelineEngine";
import type { PipelineContext, Snapshot } from "../types";
import type { StoragePort } from "../ports/StoragePort";
export class FetchHistoryStage implements Stage {
  name = "fetch_history";
  constructor(private readonly storage: StoragePort, private readonly lookbackSamples: number) {}
  private uniq(arr: string[]): string[] { return Array.from(new Set(arr)); }
  async run(ctx: PipelineContext): Promise<PipelineContext> {
    const symbols = this.uniq(ctx.batch.map(s => s.ticker_symbol__ld_tick));
    const out: Record<string, Snapshot[]> = {};
    await Promise.all(symbols.map(async (sym) => {
      out[sym] = await this.storage.readSnapshotHistory(ctx.tag, sym, this.lookbackSamples).catch(() => []);
    }));
    return { ...ctx, historyBySymbol: out };
  }
}
