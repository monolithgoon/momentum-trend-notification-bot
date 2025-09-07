/* ----------------------------------------------------------------------------
   ▶️ Example: run the pipeline
---------------------------------------------------------------------------- */

import { PipelineEngine } from "./pipeline/__deprecated__engine/PipelineEngine";
import { createDefaultPipeline } from "./pipeline/config/pipeline.config";
import { consoleLogger } from "./utils/logger";
import type { PipelineContext, Snapshot } from "./pipeline/context/PipelineContext";

async function main() {
  const stages = createDefaultPipeline(consoleLogger);
  const engine = new PipelineEngine(stages, consoleLogger);

  const batch: Snapshot[] = [
    { ticker_symbol__ld_tick: "AAPL", timestamp__ld_tick: 1, pct_change__ld_tick: 0.2, volume__ld_tick: 1000 },
    { ticker_symbol__ld_tick: "TSLA", timestamp__ld_tick: 1, pct_change__ld_tick: -0.1, volume__ld_tick: 800 },
  ];

  const ctx: PipelineContext = {
    tag: "demo",
    correlationId: "abc-123",
    previewOnly: true,
    batch,
    historyBySymbol: {
      AAPL: batch.filter(b => b.ticker_symbol__ld_tick === "AAPL"),
      TSLA: batch.filter(b => b.ticker_symbol__ld_tick === "TSLA"),
    },
    config: {
      momentum: {
        priceWeight: 1,
        volumeWeight: 1,
        includeAccelerationChk: false,
        normalizeChk: false,
        boostFormula: (v, a) => v * a,
        baseMetricKeys: { priceMetricKey: "price_pct_change", volumeMetricKey: "volume_change" },
      },
      ranking: { aggregator: "sum", take: 50 },
    },
  };

  const out = await engine.run(ctx, { validateContracts: true, exportSchema: true, mermaid: true });
  console.log("Leaderboard:", out.rankingTable);
}

main().catch((e) => console.error(e));
