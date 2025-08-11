import { ILeaderboardTickerSnapshot } from "@core/models/rest_api/__deprecatd__ILeaderboardTickerSnapshot.interface";
import { APP_CONFIG_2 } from "src/config_2/app_config";

function firstTImeSeenFlag(
	rankings: ILeaderboardTickerSnapshot["rankings"],
	firstTimeSeenChk: boolean
): ILeaderboardTickerSnapshot["rankings"] {
	return {
		...rankings,
		recency_rank: firstTimeSeenChk ? 0 : 1,
	};
}

function updateConsecutiveAppearance(existing: ILeaderboardTickerSnapshot | undefined, firstTimeSeenChk: boolean): number {
	const prevAppear = existing?.num_consecutive_appearances ?? 0;
	const hadAbsence = (existing?.num_consecutive_absences ?? 0) > 0;
	// True consecutive presence: reset to 1 if new or after any absence
	return firstTimeSeenChk || hadAbsence ? 1 : prevAppear + 1;
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

	/**
	 * Merges incoming ticker snapshots with existing leaderboard data.
	 * - Preserves old non-ranking fields
	 * - Updates recency and streaks based on incoming data
	 * - Handles both absence-based and appearance-based tracking policies
	 */

	// Clone to avoid mutating original
	const mergedSnapshotMap = new Map(existingSnapshotsMap);

	// Flatten incoming map to array for easier processing
	const incomingEntriesFlatArr: Array<[string, ILeaderboardTickerSnapshot]> = [];
	for (const [tickerSymbol, snap] of incomingSnapshotsMap.entries()) {
		incomingEntriesFlatArr.push([tickerSymbol, snap]);
	}

	// Quick lookup of normalized incoming set for absence increment later
	const incomingSymbolsNorm = new Set(incomingEntriesFlatArr.map(([sym]) => sym));

	for (const [tickerSymbol, incomingSnapshot] of incomingEntriesFlatArr) {
		const existingSnapshot = mergedSnapshotMap.get(tickerSymbol);
		const firstTimeSeenChk = !existingSnapshot;
		console.log({ firstTimeSeenChk });

		// Build updated snapshot:
		// - Preserve old non-ranking fields
		// - Overlay incoming fields
		// - Only update recency in rankings (safe-merge)
		const updatedSnapshot: ILeaderboardTickerSnapshot = {
			...existingSnapshot,
			...incomingSnapshot,
			rankings: firstTImeSeenFlag(incomingSnapshot.rankings, firstTimeSeenChk),
		};

		// console.log({ updatedSnapshot });

		// Tracking policy
		if (APP_CONFIG_2.leaderboard.useAbsenceBasedTracking) {
			// Appeared now ⇒ absence resets to 0
			updatedSnapshot.num_consecutive_absences = 0;
			// (Optional) You can choose to also reset appearances here, or leave as-is
			// updatedSnapshot.num_consecutive_appearances = 0;
		} else {
			// Appearance-based streaks
			updatedSnapshot.num_consecutive_appearances = updateConsecutiveAppearance(existingSnapshot, firstTimeSeenChk);
			// You may also want to zero out absences when seen:
			updatedSnapshot.num_consecutive_absences = 0;
		}

		mergedSnapshotMap.set(tickerSymbol, updatedSnapshot);
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
