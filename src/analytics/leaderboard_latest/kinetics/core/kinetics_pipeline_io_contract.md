```ts
/* =============================================================================
  🔹 KineticsPipeline_2.processBatch — I/O CONTRACT (Derived structure)
  -----------------------------------------------------------------------------
  Purpose:
  - Enrich latest snapshots with derivedProps metrics (velocity, acceleration, velAccBoostFns)
    **without** flat magic-string fields. Results are nested under `derivedProps.computedKinetics`.

  Signature:
  - processBatch(
      snapshots: TIn[],                          // latest snapshots (one per symbol)
      historyBySymbol: Record<string, TIn[]>     // full, ordered history per symbol
    ): Map<string, TIn>                          // symbol → enriched snapshot

  Requirements on TIn (driven by ctor config):
  - this.cfg.keys.symbolFieldKey      → must exist on TIn (e.g., "ticker_symbol__ld_tick")
  - this.cfg.keys.timestampFieldKey   → must exist on TIn (e.g., "timestamp__ld_tick")
  - Raw metric inputs used by the calculator must exist (e.g., "pct_change__ld_tick", "volume__ld_tick")

  Output shape (per entry in the returned Map):
  - TIn & {
      derivedProps: {
        computedKinetics: {
          [metricKey: string]: {
            [lookbackSpan: number]: {
              velocity: number;
              acceleration: number;
              velAccBoostFns?: Record<string, number>; // e.g., { velocity_boost: 0.021 }
            } | undefined;
          };
        };
      };
    }

  /* ---------------------------------------------------------
     Example INPUT (to the pipeline)
  --------------------------------------------------------- */
  // type Snapshot = {
  //   ticker_symbol__ld_tick: string;
  //   timestamp__ld_tick: number;
  //   pct_change__ld_tick: number;
  //   volume__ld_tick: number;
  // };
  //
  // const snapshots: Snapshot[] = [
  //   { ticker_symbol__ld_tick: "AAPL", timestamp__ld_tick: 1723710000, pct_change__ld_tick: 0.012, volume__ld_tick: 2_100_000 },
  // ];
  //
  // const historyBySymbol: Record<string, Snapshot[]> = {
  //   AAPL: [
  //     { ticker_symbol__ld_tick: "AAPL", timestamp__ld_tick: 1723706400, pct_change__ld_tick: 0.009, volume__ld_tick: 1_950_000 },
  //     { ticker_symbol__ld_tick: "AAPL", timestamp__ld_tick: 1723708200, pct_change__ld_tick: 0.010, volume__ld_tick: 2_000_000 },
  //     { ticker_symbol__ld_tick: "AAPL", timestamp__ld_tick: 1723710000, pct_change__ld_tick: 0.012, volume__ld_tick: 2_100_000 },
  //   ],
  // };

  /* ---------------------------------------------------------
     Example OUTPUT (from the pipeline) – JSON-ish
  --------------------------------------------------------- */
  // {
  //   "AAPL": {
  //     "ticker_symbol__ld_tick": "AAPL",
  //     "timestamp__ld_tick": 1723710000,
  //     "pct_change__ld_tick": 0.012,
  //     "volume__ld_tick": 2100000,
  //     "derivedProps": {
  //       "computedKinetics": {
  //         "pct_change__ld_tick": {
  //           3: { "velocity": 0.018, "acceleration": 0.004, "velAccBoostFns": { "velocity_boost": 0.021 } },
  //           5: { "velocity": 0.015, "acceleration": 0.003 }
  //         },
  //         "volume__ld_tick": {
  //           3: { "velocity": 120000, "acceleration": 15000, "velAccBoostFns": { "momentum_boost": 135000 } },
  //           5: { "velocity": 90000,  "acceleration": 12000 }
  //         }
  //       }
  //     }
  //   }
  // }

  /* ---------------------------------------------------------
     Consumer READ examples (succinct)
  --------------------------------------------------------- */
  // import { FIELD_KEYS } from "../types/FieldKeys";
  // const key = FIELD_KEYS.METRIC_FIELDS.PRICE_PCT_CHANGE;
  // const L5  = 5 as const;
  //
  // const s   = results.get("AAPL");
  // const vel = s?.derivedProps.computedKinetics[key]?.[L5]?.velocity ?? 0;
  // const acc = s?.derivedProps.computedKinetics[key]?.[L5]?.acceleration ?? 0;
  // const vb  = s?.derivedProps.computedKinetics[key]?.[L5]?.velAccBoostFns?.velocity_boost ?? 0;

  /* ---------------------------------------------------------
     Notes / Policy
  --------------------------------------------------------- */
  // - History should be ascending by timestamp; caller may normalize prior to call.
  // - Acceleration may be zeroed by Velocity Guard when |velocity| < minVelocity.
  // - Config-driven: metrics + horizons come from this.cfg.kineticsCfg (single source of truth).
  // - The pipeline clones input snapshots; original inputs are not mutated.
  // - This derivedProps approach removes flat magic-string fields and centralizes schema under `derivedProps.metrics`.
*/
