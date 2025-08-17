/** SortStage — deterministic ordering / tie-breaks */
import type { Stage } from "../PipelineEngine";
import type { PipelineContext } from "../types";
export class SortStage implements Stage {
  name = "sort";
  async run(ctx: PipelineContext): Promise<PipelineContext> {
    return ctx;
  }
}
