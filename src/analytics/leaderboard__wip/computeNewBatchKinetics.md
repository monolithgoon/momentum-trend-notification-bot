```ts
/**
 * POLICY & SEMANTICS — computeNewBatchKinetics
 * 
 * Purpose:
 * --------
 * Enrich each ticker snapshot in the *current* leaderboard scan batch with
 * derived kinetic metrics (velocity & acceleration) before merging into the
 * persisted leaderboard. This ensures downstream ranking, scoring, and streak
 * tracking logic always operates on complete, time-series-aware data.
 * 
 * Rules & Workflow:
 * -----------------
 * 1. **History Retrieval**  
 *    - For every ticker in the incoming batch, retrieve historical leaderboard snapshots
 *      from storage (bounded by `leaderboard.maxHistoryLookback` if configured).
 *    - Historical snapshots are required for calculating velocity and acceleration slopes.
 * 
 * 2. **Ordering Guarantee**  
 *    - Historical snapshots must be sorted in ascending time order by `timestamp__ld_tick`.
 *      If out of order, they are re-sorted defensively.
 * 
 * 3. **Minimum Snapshot Requirement**  
 *    - If the available snapshot history is shorter than `minSnapshotsRequiredForKinetics`,
 *      the ticker is enriched with *zeroed* velocity/acceleration fields instead of being dropped.
 *    - This prevents misleading slope outputs from sparse data.
 * 
 * 4. **Metric Computation**  
 *    - Velocity: Ordinary Least Squares (OLS) slope over a `velWindow`-length series.
 *    - Acceleration: OLS slope of the velocity series over an `accWindow`-length series.
 *    - Both computed for:
 *        a) `change_pct__ld_tick` (percent price change)
 *        b) `volume__ld_tick` (traded volume)
 * 
 * 5. **Percent-Change Velocity Guard (Optional)**  
 *    - If `usePctChgVelocityGuard` is enabled, acceleration values are suppressed (set to 0)
 *      whenever percent-change velocity is below `minPctChangeVelocity`.
 *    - This serves as a de-noising filter to avoid amplifying micro-movements.
 * 
 * 6. **Output Contract**  
 *    - Returns a `Map<string, ILeaderboardTickerSnapshot_2>` keyed by ticker symbol,
 *      where each snapshot includes its computed velocity & acceleration fields.
 *    - All non-kinetic fields from the incoming snapshot are preserved.
 * 
 * Policy Rationale:
 * -----------------
 * - Prevent invalid kinetics from under-sampled history (minimum data safeguard).
 * - Maintain strict chronological ordering for slope accuracy.
 * - Support optional noise suppression via velocity guard.
 * - Perform enrichment *before* leaderboard merge to ensure subsequent scoring
 *   and streak logic has full, consistent kinetic context.
 */
