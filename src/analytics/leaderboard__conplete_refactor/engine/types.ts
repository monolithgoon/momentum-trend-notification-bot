/**
 * Engine Types — Snapshots, Enriched, PipelineContext
 *
 * Purpose:
 *  Shared shapes passed between pipeline stages. Keeping these small and explicit
 *  makes stages easy to test and swap without a web of imports.
 */

export type Snapshot = {
  ticker_symbol__ld_tick: string;
  timestamp__ld_tick: number;   // epoch milliseconds
  pct_change__ld_tick: number;  // percent change vs your chosen base
  volume__ld_tick: number;      // volume for this sample (interval or cumulative, your choice)
};

export type Enriched = Snapshot & {
  pct_change_velocity__ld_tick: number;
  pct_change_acceleration__ld_tick: number;
  volume_velocity__ld_tick: number;
  volume_acceleration__ld_tick: number;
  warming_up__ld_tick?: boolean;
  score__ld_tick?: number;
  rank__ld_tick?: number;
};

export type PipelineContext = {
  tag: string;
  correlationId: string;
  previewOnly: boolean;
  batch: Snapshot[];
  historyBySymbol?: Record<string, Snapshot[]>;
  enrichedBySymbol?: Map<string, Enriched>;
  leaderboard?: Enriched[];
};
