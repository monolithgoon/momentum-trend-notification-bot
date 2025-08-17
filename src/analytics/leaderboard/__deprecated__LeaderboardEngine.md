```ts
/**
 * Leaderboard kinetics — semantics & runtime policy
 *
 * TERMS (plain language)
 * - sample: one stored snapshot at your chosen interval (not a candle/bar necessarily).
 * - velWindowSamples / accWindowSamples: window sizes (in samples) used to compute:
 *     • velocity  = slope over the last N samples
 *     • acceleration = change in velocity
 * - longestWindowSamples = max(velWindowSamples, accWindowSamples) — used for safety math.
 * - contextWindowCount: how many *windows* of extra history we try to keep/fetch for stability
 *     (e.g., 6 → ~6 × longestWindowSamples). More context = smoother signals, more I/O.
 * - minSamplesForAccel = longestWindowSamples + 1 — the minimum history needed to compute
 *     acceleration safely (you need one extra sample beyond the larger window).
 * - defaultLookbackSamples = longestWindowSamples * contextWindowCount — fallback target when no cap is configured.
 * - lookbackSamples: the effective history length we fetch/keep.
 *     We clamp it so it’s never < minSamplesForAccel (so we don’t compute garbage).
 *
 * BEHAVIOR (what the engine actually does)
 * 1) Derive window sizes once here (single source of truth) and pass them down to helpers.
 * 2) Decide how much history to use:
 *      lookbackSamples = max(
 *        minSamplesForAccel,
 *        (configured maxSnapshotHistoryLookback) ?? defaultLookbackSamples
 *      )
 *    If storage has fewer samples than lookbackSamples, we use whatever exists.
 * 3) Compute gating:
 *    - If tail length < minSamplesForAccel:
 *        • keep the symbol
 *        • set kinetics to 0
 *        • set warming_up__ld_tick = true
 *    - Else:
 *        • compute velocity/acceleration
 *        • set warming_up__ld_tick = false
 * 4) contextWindowCount only affects how much history we keep/fetch for context/smoothing.
 *    It does NOT change the computing gate. The only gate to “start computing” is:
 *       tail length ≥ minSamplesForAccel.
 * 5) Preview mode:
 *    - May skip persisting history to storage.
 *    - Compute step should append the current sample in-memory if the store tail is behind,
 *      so “now” is included in the math.
 *
 * IN-MEMORY STATE (per symbol)
 * - A ring buffer of the last `lookbackSamples` snapshots.
 * - Derived fields (when available):
 *     pct_change_velocity__ld_tick
 *     pct_change_acceleration__ld_tick
 *     volume_velocity__ld_tick
 *     volume_acceleration__ld_tick
 * - Flag: warming_up__ld_tick: boolean (true until tail length ≥ minSamplesForAccel).
 *
 * REAL-TIME LOOP (each new snapshot)
 * 1) Dedup / order:
 *    - Ignore if (tag, symbol, timestamp) already seen.
 *    - If timestamp < last, either drop or insert-in-order and recompute the tail (your call).
 * 2) Persist history (skip if previewOnly): storage.storeSnapshot(tag, symbol, snapshot)
 * 3) Update tail ring buffer: push; trim to ≤ lookbackSamples.
 * 4) Compute kinetics:
 *    - If tail < minSamplesForAccel → kinetics = 0, warming_up__ld_tick = true
 *    - Else → compute velocity/acceleration, warming_up__ld_tick = false
 * 5) Merge & rank:
 *    - Merge enriched snapshot into leaderboard map
 *    - Recompute sub-ranks → aggregate rank → sort → trim to maxLeaderboardSnapshotLength
 * 6) Emit:
 *    - Publish compact event (e.g., { tag, total, topTicker }) and/or the updated top N
 *    - Optionally persist the final leaderboard (skip in preview)
 *
 * STREAMING EXPECTATIONS (what you’ll see)
 * - Early on: warming_up__ld_tick = true and kinetics = 0 until at least minSamplesForAccel samples exist.
 * - After that: real velocity/acceleration values; the symbol participates in ranks.
 * - If your stream has gaps, you still compute on the last N samples.
 *   If you want time-weighted math, change the calculator to use timestamps (Δt) instead of index steps.
 *
 * POLICY GUIDELINES
 * - Keep maxSnapshotHistoryLookback ≥ minSamplesForAccel; otherwise it’s clamped up and has no effect.
 * - Tune contextWindowCount for stability vs. I/O instead of hard-coding huge lookbacks:
 *     smaller (3–4) = faster/twitchier, default (6) = balanced, larger (8–10) = smoother/more I/O.
 * - Avoid unrealistically tiny windows; practical floor is ~3–5 samples.
 */
