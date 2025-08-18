# 🚀 computeNewBatchKinetics — Semantics & Policies

Enriches the latest leaderboard snapshots with derivedProps metrics (velocity, acceleration, optional velAccBoostFns) using the **nested** schema:

```bash
snapshot.derivedProps.metrics[metricKey][lookbackSpan] = { velocity, acceleration, velAccBoostFns? }
```

- 📜 **Source of Truth:** Uses `/config/kineticsConfigSpec` for:
  - 🧮 Which metrics to compute
  - ⏳ Per-metric horizons (lookbacks) & normalization
  - 🚦 Velocity guard + minVelocity
  - 🧩 Boost formulas
- 🕰️ **History Handling:** Histories are normalized (ascending by timestamp). The current snapshot is appended if newer than the last historical point.

---

## ⚙️ How `computeNewBatchKinetics` Works

The process is broken down into five main steps:

1. **🔑 Resolve Runtime Keys:**  
   Defines `symbolField` and `tsField` to locate ticker symbol and timestamp in each snapshot, set to `KineticsSymbolFieldKey.TICKER_SYMBOL_FIELD` and `KineticsTimestampFieldKey.LEADERBOARD_TIMESTAMP`.

2. **🛠️ Instantiate Pipeline:**  
   Creates a `KineticsPipeline_3` object, configured with `kineticsConfigSpec` and the resolved keys.

3. **📏 Determine Minimum History:**  
   Calculates the minimum number of snapshots required for metrics computation (`maxLookback + 1` from `kineticsConfigSpec`), overridable via `opts.minRequiredSnapshots`.

4. **🧹 Pre-process Histories:**  
   For each snapshot:
   - Retrieves historical data from `historyBySymbolMap`
   - Sorts by timestamp
   - Appends current snapshot if it's the newest
   - If history is too short, returns snapshot unmodified; otherwise, queues for batch processing

5. **⚡ Run Enrichment Pipeline:**  
   If there are queued snapshots, calls `pipeline.processBatch()` to compute velocity, acceleration, and velAccBoostFns for all "ready" symbols in a single batch. Returns a map keyed by symbol with enriched snapshots.

---

## 📥 Inputs

- `snapshots: TIn[]` — Latest snapshots (one per symbol)
- `historyBySymbol: Record<string, TIn[]>` — Full history per symbol (unordered OK)
- `kineticsConfigSpec: IPipelineComputePlanSpec` — Metrics + horizons + guards + velAccBoostFns (authoritative)
- `opts.minRequiredSnapshots?: number` — Override for history length; defaults to `(maxLookback + 1)`

---

## 📤 Outputs

```bash
Map<string, TIn> keyed by symbol, where each TIn is **cloned** and enriched with:
  {
    ...snapshot,
    derivedProps: {
      metrics: {
        [metricKey: string]: {
          [lookbackSpan: number]: {
            velocity: number;
            acceleration: number;
            velAccBoostFns?: Record<string, number>;
          } | undefined;
        };
      };
    }
  }
```

---

## 🛡️ Key Policies

- 🔒 **Source of Truth:** `/config/kineticsConfigSpec` defines metrics & horizons. No hardcoded fields.
- 🧭 **Derived Schema:** No flat magic-string output keys; everything lives under `derivedProps.metrics`.
- 🧪 **Type Safety:** Metric keys and lookbacks validated upstream via FieldKeys/config typing.
- 🧱 **Non-mutating:** Input `snapshots` are not mutated; enriched copies are returned.
- 🧹 **History Hygiene:** Sorts ascending by timestamp; appends current snapshot if newer.
- 🚦 **Velocity Guard:** If enabled and `|velocity| < minVelocity`, acceleration is set to 0 for that job.
- 🧩 **Boosts:** Each configured boost receives (velocity, acceleration) and is written under `velAccBoostFns[name]`.

---

## ✅ Invariants / Preconditions

- Each snapshot must have:
  - 🏷️ Symbol at `this.cfg.keys.symbolFieldKey`
  - 🕒 Timestamp at `this.cfg.keys.timestampFieldKey`
  - 📊 Raw inputs required by the calculator for configured metrics (e.g., price pct change, volume)
- `historyBySymbol[symbol]` contains homogeneous `TIn` entries for that symbol.

---

### 🏁 Postconditions

- If history length for a symbol is < minRequiredSnapshots, that symbol’s snapshot is returned unmodified.
- Otherwise, all configured (metric × horizon) jobs are computed and written to `derivedProps.metrics`.

---

## ⚠️ Failure & Edge Handling

- ❌ Missing symbol field → snapshot is skipped.
- ❓ Unknown metricKey (not in FieldKeys/config) → job is skipped (no throw).
- 🧩 Missing boost mapping for a horizon → that boost is skipped for that horizon.
- 🔄 Non-monotonic timestamps in history → fixed by local ascending sort.

---

## 🚀 Performance Notes

- Histories are preprocessed once (sort + conditional append).
- Pipeline runs in a single batch for all “ready” symbols (enough history), minimizing per-symbol overhead.

---

## 🧵 Thread-Safety / Side Effects

- Pure relative to inputs (aside from local sorting/array copy); no global state, no I/O.

---

## 🗂️ Versioning / Migration

- Implements the **nested derivedProps schema**. If consumers still expect flat keys, migrate them to `derivedProps.metrics[metricKey][lookbackSpan]` accessors before removing legacy paths.

---

## 👀 Example Consumer Access

```bash
const k = FIELD_KEYS.METRIC_FIELDS.PRICE_PCT_CHANGE;
const lookback_3 = 3 as const;
const s = results.get("AAPL");
const vel = s?.derivedProps.metrics[k]?.[lookback_3]?.velocity ?? 0;
const acc = s?.derivedProps.metrics[k]?.[lookback_3]?.acceleration ?? 0;
const vb  = s?.derivedProps.metrics[k]?.[lookback_3]?.velAccBoostFns?.velocity_boost ?? 0;
```
