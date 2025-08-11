import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";

// Helpers (unchanged semantics)
function updateConsecutiveAppearance(
  existing: ILeaderboardTickerSnapshot_2 | undefined,
  isFirstTimeSeen: boolean
): number {
  const prevAppear = existing?.num_consecutive_appearances ?? 0;
  const hadAbsence = (existing?.num_consecutive_absences ?? 0) > 0;
  // New symbol or we’re resuming after any absence → start at 1, else +1
  return isFirstTimeSeen || hadAbsence ? 1 : prevAppear + 1;
}

function updateConsecutiveAbsence(prev: number | undefined): number {
  return (prev ?? 0) + 1;
}

/**
 * For symbols that existed before but are missing in the incoming set,
 * increment their absence counters and (optionally) reset appearances.
 * No recency handling anymore.
 */
function incrementAbsencesForMissing(
  mergedMap: Map<string, ILeaderboardTickerSnapshot_2>,
  incomingSymbols: Set<string>,
  opts?: { resetAppearanceOnAbsence?: boolean }
): void {
  const resetAppearanceOnAbsence = opts?.resetAppearanceOnAbsence ?? true;

  for (const [symbol, snap] of mergedMap) {
    if (!incomingSymbols.has(symbol)) {
      snap.num_consecutive_absences = updateConsecutiveAbsence(snap.num_consecutive_absences);
      if (resetAppearanceOnAbsence) snap.num_consecutive_appearances = 0;
      // IMPORTANT: never flip first_time_seen_flag back to true on absence.
      mergedMap.set(symbol, snap);
    }
  }
}

/**
 * Merges the prior leaderboard state with the latest scan results.
 *
 * Policies:
 * - For each incoming symbol:
 *    • New symbol → first_time_seen_flag = true, appearances = 1, absences = 0.
 *    • Existing symbol → first_time_seen_flag = false, appearances++ (or reset to 1 if had absence), absences = 0.
 * - After merging, for symbols missing in this scan:
 *    • absences++, appearances reset to 0 (if appearance-mode policy active).
 *    • first_time_seen_flag remains unchanged (never reverts to true).
 * - Rankings are passed through unchanged; no recency_rank is used.
 * - Incoming fields overwrite old values except streak counters, which are updated by policy.
 * - Output map is the canonical "current leaderboard" view.
 */

export function mergeWithExistingLeaderboard_3(
  existingSnapshotsMap: Map<string, ILeaderboardTickerSnapshot_2>,
  incomingSnapshotsMap: Map<string, ILeaderboardTickerSnapshot_2>
): Map<string, ILeaderboardTickerSnapshot_2> {
  // Clone to avoid mutating caller’s map
  const mergedSnapshotMap = new Map(existingSnapshotsMap);

  // Flatten incoming for easy iteration + build a quick lookup set
  const incomingSnapshots: Array<[string, ILeaderboardTickerSnapshot_2]> = [];
  for (const [symbol, snap] of incomingSnapshotsMap) incomingSnapshots.push([symbol, snap]);
  const incomingSymbols = new Set(incomingSnapshots.map(([s]) => s));

  for (const [symbol, incomingSnapshot] of incomingSnapshots) {
    const existing = mergedSnapshotMap.get(symbol);
    const isFirstTimeSeen = !existing;

    // Flip the transient flag off if we've seen it before; keep true only on first appearance
    const first_time_seen_flag = isFirstTimeSeen ? true : false;

		// 
    const updatedSnapshot: ILeaderboardTickerSnapshot_2 = {
      // preserve prior non-ranking fields if you want them carried over
      ...existing,
      // overlay incoming fresh data
      ...incomingSnapshot,

      // ensure streaks are consistent with policy
      num_consecutive_absences: 0, // seen this scan → absence resets

      // first_time_seen_flag semantics (replace any incomingSnapshot default)
      first_time_seen_flag,

      // NOTE: rankings are passed through as provided by upstream steps (no recency updates anymore)
      rankings: incomingSnapshot.rankings,
    };

    // Appearance-based policy:
    updatedSnapshot.num_consecutive_appearances = updateConsecutiveAppearance(existing, isFirstTimeSeen);

    mergedSnapshotMap.set(symbol, updatedSnapshot);
  }

  // After merging present tickers, mark absences for any that are missing this scan
  incrementAbsencesForMissing(mergedSnapshotMap, incomingSymbols, {
    // If using appearance-based streaks, a miss breaks the streak → reset appearances.
    resetAppearanceOnAbsence: true,
  });

  return mergedSnapshotMap;
}
