```ts
/**
 * POLICY & SEMANTICS — computeNewBatchKinetics
 * 
 * Purpose:
 * --------
 * Enrich each ticker in the *current* leaderboard scan batch with calculated
 * kinetic metrics (velocity & acceleration) before merging into the stored leaderboard.
 * This ensures that subsequent ranking and scoring steps have complete,
 * time-series-aware data for each ticker.
 * 
 * Rules & Workflow:
 * -----------------
 * 1. **History Retrieval**  
 *    - For every ticker in the incoming batch, fetch historical leaderboard snapshots
 *      from storage (bounded by `leaderboard.maxHistoryLookback` if configured).
 *    - Historical data is used to compute slopes for velocity and acceleration.
 * 
 * 2. **Ordering Guarantee**  
 *    - Historical snapshots must be in ascending time order. If not, sort by `timestamp__ld_tick`.
 * 
 * 3. **Minimum Data Requirement**  
 *    - If the number of historical snapshots is less than `minSnapshotsRequiredForKinetics`,
 *      the ticker is skipped entirely (not enriched).
 *    - This prevents noisy or meaningless slope calculations.
 * 
 * 4. **Metric Computation**  
 *    - Velocity: OLS slope over `velWindow` bars.
 *    - Acceleration: OLS slope of the velocity values over `accWindow` bars.
 *    - Both computed for:
 *        a) `pct_change__ld_tick` (price change %)
 *        b) `volume__ld_tick` (traded volume)
 * 
 * 5. **Percent Change Velocity Guard (Optional)**  
 *    - If `usePctChgVelocityGuard` is enabled, acceleration is suppressed (set to 0)
 *      when percent-change velocity is below `minPctChangeVelocity`.
 *      This acts as a de-noising filter against low-slope movements.
 * 
 * 6. **Output Contract**  
 *    - Returns a `Map<string, ILeaderboardTickerSnapshot_2>` keyed by ticker symbol,
 *      where each snapshot includes its calculated velocity & acceleration fields.
 *    - Existing non-kinetic fields are preserved from the incoming batch.
 * 
 * Policy Rationale:
 * -----------------
 * - Avoid misleading kinetics from sparse history (min data rule).
 * - Preserve chronological order for correct slope math.
 * - Allow configuration of noise filtering (velocity guard).
 * - Perform enrichment *before* merging into leaderboard so streak tracking,
 *   ranking, and scoring have complete data from the outset.
 */
```