/**
 * PipelineEngine — simple stage runner
 *
 * Purpose:
 *  Execute a sequence of single-responsibility stages. Each stage receives a PipelineContext
 *  and returns a (possibly extended) PipelineContext. This keeps the engine composable.
 */

import type { PipelineContext } from "./types";
import type { Logger } from "./ports/Logger";

export interface Stage {
  name: string;
  run(ctx: PipelineContext): Promise<PipelineContext>;
}

export class PipelineEngine {
  constructor(private readonly stages: Stage[], private readonly log: Logger) {}
  async run(ctx: PipelineContext): Promise<PipelineContext> {
    let cur = ctx;
    for (const s of this.stages) {
      const t0 = Date.now();
      cur = await s.run(cur);
      this.log.info(`[stage] ${s.name} ok`, { ms: Date.now() - t0 });
    }
    return cur;
  }
}
