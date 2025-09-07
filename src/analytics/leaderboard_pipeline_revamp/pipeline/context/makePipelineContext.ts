import { FIELD_KEYS } from "@analytics/leaderboard_latest/kinetics/config/KineticsFieldBindings";
import { IPipelineContext } from "./PipelineContext.interface";
import { DEFAULT_KINETICS_SPEC } from "../specs/defaultKineticsSpec";

export function makePipelineContext(
  overrides: Partial<IPipelineContext> = {}
): IPipelineContext {
  const widestLookbackSpan = Math.max(
    ...Object.keys(DEFAULT_KINETICS_SPEC.horizons).map(Number)
  );

  return {
    nowEpochMs: Date.now(),
    tickerSymbolFieldKey: FIELD_KEYS.TICKER_SYMBOL_FIELD,
    timestampFieldKey: FIELD_KEYS.TIMESTAMP_FIELD,
    correlationId: `ctx_${Date.now()}`,
    incomingBatch: [],
    historyBySymbol: {},
    config: {
      computeSpec: {
        minSnapshotsNeeded: widestLookbackSpan + 1,
        kinetics: DEFAULT_KINETICS_SPEC,
      },
      ranking: { scoringStrategy: "sum", limit: 10 },
      algorithm: "DIFF",
    },
    ...overrides,
  };
}
