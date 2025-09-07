/** PersistHistoryStage — append snapshots to storage */
import type { Stage } from "../PipelineEngine";
import type { PipelineContext } from "../types";
import type { StoragePort } from "../ports/StoragePort";
import type { Logger } from "../ports/Logger";
import { chunk } from "../utils/chunk";
export class PersistHistoryStage implements Stage {
  name = "persist_history";
  constructor(
    private readonly storage: StoragePort,
    private readonly log: Logger,
    private readonly chunkSize: number,
    private readonly skip: boolean
  ) {}
  async run(ctx: PipelineContext): Promise<PipelineContext> {
    if (this.skip) return ctx;
    const { tag, batch, correlationId } = ctx;
    let success = 0, failed = 0;
    for (const part of chunk(batch, this.chunkSize)) {
      const results = await Promise.allSettled(
        part.map(s => this.storage.storeSnapshot(tag, s.ticker_symbol__ld_tick, s))
      );
      for (const r of results) { if (r.status === "fulfilled") success++; else failed++; }
    }
    if (failed) this.log.warn("[persist_history] partial failures", { tag, correlationId, success, failed });
    return ctx;
  }
}
