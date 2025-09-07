/* ----------------------------------------------------------------------------
   🧪 Fixtures: tiny samples for dev/testing
---------------------------------------------------------------------------- */

import type { Snapshot } from "../context/PipelineContext";

export const sampleBatch: Snapshot[] = [
  { ticker_symbol__ld_tick: "AAPL", timestamp__ld_tick: 1710000000000, pct_change__ld_tick: 0.12, volume__ld_tick: 1000 },
  { ticker_symbol__ld_tick: "AAPL", timestamp__ld_tick: 1710000600000, pct_change__ld_tick: 0.20, volume__ld_tick: 1400 },
  { ticker_symbol__ld_tick: "TSLA", timestamp__ld_tick: 1710000000000, pct_change__ld_tick: -0.05, volume__ld_tick: 800 },
  { ticker_symbol__ld_tick: "TSLA", timestamp__ld_tick: 1710000600000, pct_change__ld_tick: -0.02, volume__ld_tick: 950 },
];

export const sampleHistory: Record<string, Snapshot[]> = {
  AAPL: sampleBatch.filter((s) => s.ticker_symbol__ld_tick === "AAPL"),
  TSLA: sampleBatch.filter((s) => s.ticker_symbol__ld_tick === "TSLA"),
};
