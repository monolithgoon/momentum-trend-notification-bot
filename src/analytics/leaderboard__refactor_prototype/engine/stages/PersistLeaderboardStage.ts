/** PersistLeaderboardStage — store final list */
import type { Stage } from "../PipelineEngine";
import type { PipelineContext } from "../types";
import type { StoragePort } from "../ports/StoragePort";
export class PersistLeaderboardStage implements Stage {
  name = "persist_leaderboard";
  constructor(private readonly storage: StoragePort, private readonly skip: boolean) {}
  async run(ctx: PipelineContext): Promise<PipelineContext> {
    if (!this.skip) {
      await this.storage.persistLeaderboard(ctx.tag, ctx.leaderboard || []);
    }
    return ctx;
  }
}
