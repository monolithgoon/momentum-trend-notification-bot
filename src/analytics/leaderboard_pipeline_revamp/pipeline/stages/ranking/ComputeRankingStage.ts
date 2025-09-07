/* ----------------------------------------------------------------------------
   🏁 ComputeRankingStage
   Contract:
     input : ["momentumBySymbol"]
     output: ["rankingTable"]
---------------------------------------------------------------------------- */

import { PipelineContext, LeaderboardRow } from "../../context/PipelineContext";
import { Stage } from "../../__deprecated__contracts/StageContract";

export class ComputeRankingStage implements Stage<"momentumBySymbol", "rankingTable"> {
  name = "ComputeRankingStage" as const;
  contract = {
    input: ["momentumBySymbol"] as const,
    output: ["rankingTable"] as const,
  };

  async run(ctx: Pick<PipelineContext, "momentumBySymbol"> & Partial<PipelineContext>) {
    const agg = ctx.config?.ranking?.aggregator ?? "sum";
    const take = ctx.config?.ranking?.take ?? 100;

    const rows: LeaderboardRow[] = [];

    for (const [symbol, momo] of (ctx.momentumBySymbol ?? new Map()).entries()) {
      const scores = Object.values(momo.bySpan).map((v) => v.momentumScore);
      let score = 0;
      if (agg === "sum") score = scores.reduce((a, b) => a + b, 0);
      else if (agg === "max") score = Math.max(...scores, 0);
      else if (agg === "latest") score = scores[scores.length - 1] ?? 0;
      rows.push({ symbol, score });
    }

    rows.sort((a, b) => b.score - a.score);
    rows.forEach((r, i) => (r.rank = i + 1));

    return { rankingTable: rows.slice(0, take) };
  }
}
