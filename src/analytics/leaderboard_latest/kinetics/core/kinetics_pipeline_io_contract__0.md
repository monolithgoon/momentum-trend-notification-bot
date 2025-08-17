# KineticsPipeline_4 — Semantics & Policies + I/O CONTRACT (Updated)

> **Scope**: This document defines the runtime semantics, policies, and the I/O contract for `KineticsPipeline_4.processBatch`. It supersedes the earlier v2 contract that wrote to `derivedProps.metrics` and now documents the nested results under `derivedProps.computedKinetics.byMetric[metricKey].byLookbackSpan[span]`.

---

## 1) Semantics

### 1.1 What the pipeline computes
For each latest snapshot in a batch (one per symbol), and for each configured **metric** (e.g., price % change, volume change) and **lookback span** (e.g., 3/5/8):
- **Velocity (1st derivative)** over the lookback span
- **Acceleration (2nd derivative)** derived from velocity over the same span
- **Boosts (optional)**: custom scalar transforms per `(velocity, acceleration)`

All outputs are written into a **nested structure** under the snapshot’s `derivedProps`.

### 1.2 Data model (nested)
- Level 1: `derivedProps.computedKinetics`
- Level 2: `byMetric[metricKey]`
- Level 3: `byLookbackSpan[span]`
- Leaf: `{ velocity: number, acceleration: number, boosts?: Record<string, number> }`

This is a 2-D matrix keyed by `(metricKey, lookbackSpan)` which avoids flat, magic-string fields and groups related values together.

### 1.3 Inputs & runtime keys
- `symbolFieldKey` (string key on snapshots): Identifies the symbol (Map key).
- `timestampFieldKey` (string key on snapshots): Used to order history and compute kinetics.
- **Metric fields** required by the calculator must exist on snapshots and in history (e.g., percent change, volume).

### 1.4 Configuration
Config (e.g., `kineticsComputePlanSpec`) defines:
- **perMetricPlans**: array of metric plans
  - `metricFieldKey`: which field to read (e.g., `PRICE_PCT_CHANGE`)
  - `horizons`: array of `{ lookbackSpan, normalizeStrategy | valueTransform }`
  - `enableVelocityGuard`: boolean
  - `minVelocity`: threshold for velocity guard
  - `boosts`: array of `{ name, formula(vel, acc) }`

> **Naming note**: If migrating from `normalizeStrategy`, you may rename to `valueTransform` for clarity (no functional change intended).

### 1.5 Velocity Guard policy
If `enableVelocityGuard` is `true` and `|velocity| < minVelocity`, **acceleration is set to `0`** for that `(metricKey, span)` entry. Velocity remains as computed.

### 1.6 History requirements
- History should be **ascending by timestamp** for correct derivative math.
- Callers **should pre-filter** symbols that lack sufficient history for the maximum configured lookback (e.g., via a pre-check like `minRequiredSnapshots = maxLookback + 1`). If you pass shorter histories, calculators may degrade to zeros or undefined behavior depending on implementation; the pipeline itself does not re-check sufficiency.

### 1.7 Immutability & cloning
- Input snapshots are **not mutated**. The pipeline clones/expands into a new enriched snapshot and writes results to `derivedProps`.
- The returned Map’s values are safe for downstream merges.

### 1.8 Determinism & idempotence
- Given the same inputs (snapshots + history + config), outputs are **deterministic**.
- Re-running on the **same** inputs is **idempotent** (no side effects beyond recomputation).

### 1.9 Error handling
- Missing symbol field → snapshot is **skipped**.
- Missing metric fields → downstream computations may produce zeros; ensure configs and data align.
- Boost formula exceptions should be **caught/guarded** by the caller if using untrusted formulas.

### 1.10 Versioning policy
- Schema path is versioned via the pipeline name: `KineticsPipeline_4`.  
- Changes to result nesting or field names must be accompanied by a clear migration note and test coverage.

---

## 2) I/O CONTRACT (Updated for KineticsPipeline_4)

### 2.1 Signature
```ts
processBatch(
  snapshots: TIn[],                          // latest snapshots (one per symbol)
  historyBySymbol: Record<string, TIn[]>     // full, ordered history per symbol
): Map<string, TOut<TIn>>                    // symbol → enriched snapshot
```

- `TIn` is the base snapshot type containing the runtime keys and metric fields.
- `TOut<TIn>` is `TIn` plus `derivedProps.computedKinetics.byMetric[metricKey].byLookbackSpan[span]`.

### 2.2 Requirements on `TIn`
- `symbolFieldKey` must exist (e.g., `"ticker_symbol__ld_tick"`).
- `timestampFieldKey` must exist (e.g., `"timestamp__ld_tick"`).
- Metric source fields must exist (e.g., `"pct_change__ld_tick"`, `"volume__ld_tick"`).

### 2.3 Output shape (per Map entry)
```ts
TIn & {
  derivedProps: {
    computedKinetics: {
      byMetric: {
        [metricKey: string]: {
          byLookbackSpan: {
            [span: number]: {
              velocity: number;
              acceleration: number;
              boosts?: Record<string, number>;
            } | undefined;
          };
        } | undefined;
      };
    };
  };
}
```

### 2.4 Example INPUT
```ts
type Snapshot = {
  ticker_symbol__ld_tick: string;
  timestamp__ld_tick: number;
  pct_change__ld_tick: number;
  volume__ld_tick: number;
};

const snapshots: Snapshot[] = [
  { ticker_symbol__ld_tick: "AAPL", timestamp__ld_tick: 1723710000, pct_change__ld_tick: 0.012, volume__ld_tick: 2_100_000 },
];

const historyBySymbol: Record<string, Snapshot[]> = {
  AAPL: [
    { ticker_symbol__ld_tick: "AAPL", timestamp__ld_tick: 1723706400, pct_change__ld_tick: 0.009, volume__ld_tick: 1_950_000 },
    { ticker_symbol__ld_tick: "AAPL", timestamp__ld_tick: 1723708200, pct_change__ld_tick: 0.010, volume__ld_tick: 2_000_000 },
    { ticker_symbol__ld_tick: "AAPL", timestamp__ld_tick: 1723710000, pct_change__ld_tick: 0.012, volume__ld_tick: 2_100_000 },
  ],
};
```

### 2.5 Example OUTPUT (JSON-ish)
```json
{
  "AAPL": {
    "ticker_symbol__ld_tick": "AAPL",
    "timestamp__ld_tick": 1723710000,
    "pct_change__ld_tick": 0.012,
    "volume__ld_tick": 2100000,
    "derivedProps": {
      "computedKinetics": {
        "byMetric": {
          "pct_change__ld_tick": {
            "byLookbackSpan": {
              "3": { "velocity": 0.018, "acceleration": 0.004, "boosts": { "velocity_boost": 0.021 } },
              "5": { "velocity": 0.015, "acceleration": 0.003 }
            }
          },
          "volume__ld_tick": {
            "byLookbackSpan": {
              "3": { "velocity": 120000, "acceleration": 15000, "boosts": { "momentum_boost": 135000 } },
              "5": { "velocity": 90000,  "acceleration": 12000 }
            }
          }
        }
      }
    }
  }
}
```

### 2.6 Consumer read examples
```ts
const s = results.get("AAPL");
const key = "pct_change__ld_tick" as const;
const L5  = 5 as const;

const vel = s?.derivedProps.computedKinetics.byMetric[key]?.byLookbackSpan[L5]?.velocity ?? 0;
const acc = s?.derivedProps.computedKinetics.byMetric[key]?.byLookbackSpan[L5]?.acceleration ?? 0;
const vb  = s?.derivedProps.computedKinetics.byMetric[key]?.byLookbackSpan[L5]?.boosts?.velocity_boost ?? 0;
```

---

## 3) Policies (Do/Don’t)

**Do**
- Ensure histories are **ascending** and **sufficient** before calling.
- Keep config as the **single source of truth** for metrics/spans/guards/boosts.
- Treat derived results as **immutable** snapshots for downstream consumers.
- Add tests for new **value transforms** and **boost** strategies.

**Don’t**
- Don’t mutate input arrays/objects passed to `processBatch`.
- Don’t store flat kinetics fields on the root snapshot (always use the nested path).
- Don’t assume acceleration is non-zero—velocity guard may zero it out.

---

## 4) Migration Notes from v2 → v4

- **Result path**: `derivedProps.metrics[metricKey][span]` → `derivedProps.computedKinetics.byMetric[metricKey].byLookbackSpan[span]`
- **Naming**: If desired, `normalizeStrategy` → `valueTransform` (no change in behavior implied).
- **Pre-checks**: Prefer a pre-stage that skips symbols without enough history.

---

## 5) Glossary

- **Velocity**: First derivative of the metric over the lookback span.
- **Acceleration**: Second derivative (rate of change of velocity).
- **Boosts**: Extra scalar terms computed from `(velocity, acceleration)` via user-provided formulas.
- **Lookback span**: Number of steps used to compute derivatives.
