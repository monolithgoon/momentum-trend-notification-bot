```ts
/* =============================================================================
   📄 SEMANTICS
   -----------------------------------------------------------------------------
   The KineticsCalculator is a stateful computation module responsible for
   deriving short- and long-term momentum metrics from historical ticker
   snapshots. It does this by maintaining an in-memory history of snapshots
   per ticker and applying mathematical slope calculations (velocity) and
   second-order slope calculations (acceleration) across configurable lookback
   windows.

   - "Velocity" here means the first derivative of a metric with respect to
     time — e.g., how quickly the % change in price or volume is moving.
   - "Acceleration" means the second derivative — e.g., how quickly that rate
     of change itself is changing over time.
   - Calculations are done via Ordinary Least Squares (OLS) regression on the
     historical data, rather than simple two-point differences, to reduce
     noise.
   - Normalization (optional per config) rescales values across tickers so
     that comparisons are meaningful regardless of absolute scale.

   The calculator operates entirely on discrete market snapshots, not
   continuous streams — each snapshot is timestamped, and lookback windows are
   expressed in number of snapshots, not clock time.

   -----------------------------------------------------------------------------
   📜 POLICY
   -----------------------------------------------------------------------------
   1. **Data Scope**
      - The historyMap stores all snapshots ingested during the calculator’s
        lifetime.
      - No persistence is handled here; external orchestration is responsible
        for snapshot retention policies and memory management.

   2. **Config Binding**
      - All lookback windows and normalization rules are supplied via a
        MultiHorizonKineticsConfig instance.
      - Config keys are semantic enums (PRICE_PCT_CHANGE, VOLUME_CHANGE) mapped to
        concrete leaderboard snapshot fields.

   3. **Calculation Integrity**
      - Velocity is computed using the exact snapshot field resolved from the
        semantic type via VelocityFieldMap.
      - Acceleration is computed on the velocity series derived from the same
        snapshot field via AccelerationCalcFieldMap.
      - Both velocity and acceleration arrays must meet the configured minimum
        snapshot count before computation; otherwise, a zero is returned.

   4. **Boost Ratios**
      - Boost metrics compare short-term to long-term horizon slopes, intended
        to signal acceleration potential.
      - Current implementation hard-codes L3 vs L8 boosts; this must be made
        configurable to align with future dynamic strategies.

   5. **Output Contract**
      - The `raw` map contains unadjusted slope values.
      - The `normalized` map contains scaled values if normalization was
        enabled for that metric.
      - The `boosts` map contains ratio-based metrics for horizon comparison.

   6. **Error Handling**
      - Insufficient data (fewer snapshots than required) results in zero
        output for that metric, ensuring no NaN or undefined values enter
        downstream ranking.
      - No exceptions are thrown during calculation; all failures degrade to
        safe default values.

   -----------------------------------------------------------------------------
   In summary, the KineticsCalculator is the core mathematical engine for
   transforming raw historical ticker snapshots into multi-horizon momentum
   signals, ready for ranking and leaderboard integration.
============================================================================= */
```