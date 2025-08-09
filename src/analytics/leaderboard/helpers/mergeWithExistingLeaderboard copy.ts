import { ILeaderboardTickerSnapshot } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface";
import { APP_CONFIG_2 } from "src/config_2/app_config";

/** --- Helpers: policy primitives --- */

function normalizeSymbol(sym: string): string {
  // Ensure consistent map keys across scans
  return sym.trim().toUpperCase();
}

function updateRecency(
  rankings: ILeaderboardTickerSnapshot["rankings"] | undefined,
  isNewEntry: boolean
): ILeaderboardTickerSnapshot["rankings"] {
  return {
    ...(rankings ?? {}),
    recency_rank: isNewEntry ? 0 : 1,
  };
}

function updateConsecutiveAppearance(
  existing: ILeaderboardTickerSnapshot | undefined,
  isNewEntry: boolean
): number {
  const prevAppear = existing?.num_consecutive_appearances ?? 0;
  const hadAbsence = (existing?.num_consecutive_absences ?? 0) > 0;
  // True consecutive presence: reset to 1 if new or after any absence
  return isNewEntry || hadAbsence ? 1 : prevAppear + 1;
}

function updateConsecutiveAbsence(prev: number | undefined): number {
  return (prev ?? 0) + 1;
}

/**
 * For symbols that existed before but are missing in the incoming set,
 * increment their absence counters (and optionally reset appearances).
 */
function incrementAbsencesForMissing(
  mergedMap: Map<string, ILeaderboardTickerSnapshot>,
  incomingSymbolsNorm: Set<string>,
  opts?: { resetAppearanceOnAbsence?: boolean }
): void {
  const resetAppearanceOnAbsence = opts?.resetAppearanceOnAbsence ?? true;

  for (const [existingSym, snap] of mergedMap.entries()) {
    if (!incomingSymbolsNorm.has(existingSym)) {
      snap.num_consecutive_absences = updateConsecutiveAbsence(snap.num_consecutive_absences);
      if (resetAppearanceOnAbsence) {
        snap.num_consecutive_appearances = 0;
      }
      // If you also want to mark recency for disappeared tickers, do it elsewhere.
      mergedMap.set(existingSym, snap);
    }
  }
}

/** --- Main merge: only recency + streaks; preserve old non-ranking fields --- */

export function mergeWithExistingLeaderboard(
  existingSnapshotsMap: Map<string, ILeaderboardTickerSnapshot>,
  incomingSnapshotsMap: Map<string, ILeaderboardTickerSnapshot>
): Map<string, ILeaderboardTickerSnapshot> {
  // Clone to avoid mutating original
  const mergedSnapshotMap = new Map(existingSnapshotsMap);

  // Normalize incoming symbols first
  const incomingEntriesNorm: Array<[string, ILeaderboardTickerSnapshot]> = [];
  for (const [rawSym, snap] of incomingSnapshotsMap.entries()) {
    incomingEntriesNorm.push([normalizeSymbol(rawSym), snap]);
  }

  // Quick lookup of normalized incoming set for absence increment later
  const incomingSymbolsNorm = new Set(incomingEntriesNorm.map(([sym]) => sym));

  for (const [symbolNorm, incomingSnapshot] of incomingEntriesNorm) {
    const existingSnapshot = mergedSnapshotMap.get(symbolNorm);
    const isNewEntry = !existingSnapshot;

    // Build updated snapshot:
    // - Preserve old non-ranking fields
    // - Overlay incoming fields
    // - Only update recency in rankings (safe-merge)
    const updatedSnapshot: ILeaderboardTickerSnapshot = {
      ...existingSnapshot,
      ...incomingSnapshot,
      rankings: updateRecency(incomingSnapshot.rankings, isNewEntry),
    };

    // Tracking policy
    if (APP_CONFIG_2.leaderboard.useAbsenceBasedTracking) {
      // Appeared now ⇒ absence resets to 0
      updatedSnapshot.num_consecutive_absences = 0;
      // (Optional) You can choose to also reset appearances here, or leave as-is
      // updatedSnapshot.num_consecutive_appearances = 0;
    } else {
      // Appearance-based streaks
      updatedSnapshot.num_consecutive_appearances = updateConsecutiveAppearance(
        existingSnapshot,
        isNewEntry
      );
      // You may also want to zero out absences when seen:
      updatedSnapshot.num_consecutive_absences = 0;
    }

    mergedSnapshotMap.set(symbolNorm, updatedSnapshot);
  }

  // After merging present tickers, bump absences for any that are missing this scan
  // This applies regardless of policy; harmless in appearance-mode but useful if you inspect absences.
  incrementAbsencesForMissing(mergedSnapshotMap, incomingSymbolsNorm, {
    resetAppearanceOnAbsence: !APP_CONFIG_2.leaderboard.useAbsenceBasedTracking ? true : false,
    // Rationale:
    // - In appearance-mode, a miss typically breaks the appearance streak → reset appearances.
    // - In absence-mode, you might choose to keep appearances untouched (set false) if you track both.
  });

  return mergedSnapshotMap;
}
