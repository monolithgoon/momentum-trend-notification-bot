import { ILeaderboardTickerSnapshot } from "@core/models/rest_api/__deprecatd__ILeaderboardTickerSnapshot.interface";
import { APP_CONFIG_2 } from "src/config_2/app_config";

/**
 * Merges incoming ticker snapshots into the existing leaderboard.
 *
 * Responsibilities:
 * - Update tickers that have reappeared in this scan
 * - Add new tickers that weren’t present before
 * - Reset or increment absence/appearance counters based on tracking mode
 * - Set `recency_rank`:
 *    - 0 = just entered the leaderboard
 *    - 1 = was already on leaderboard
 */
export function mergeWithExistingLeaderboard(
	existingSnapshotsMap: Map<string, ILeaderboardTickerSnapshot>,
	incomingSnapshotsMap: Map<string, ILeaderboardTickerSnapshot>
): Map<string, ILeaderboardTickerSnapshot> {
	// Create a new map to avoid mutating the original
	const mergedSnapshotMap = new Map(existingSnapshotsMap);

	for (const [symbol, incomingSnapshot] of incomingSnapshotsMap.entries()) {
		const existingSnapshot = mergedSnapshotMap.get(symbol);
		const isNewEntryChk = !existingSnapshot;

		// ================================
		// 🆕 Initialize base snapshot with recency_rank
		// ================================
		// const updatedSnapshot: ILeaderboardTickerSnapshot = {
		// 	...(existingSnapshot ?? {}),
		// 	...incomingSnapshot,
		// 	rankings: {
    //     recency_rank: isNewEntryChk ? 0 : 1,
    //     // Use defaults for now
    //     volume_rank: -1,
    //     vol_vel_rank: -1,
    //     vol_acc_rank: -1,
    //     pct_change_rank: -1,
    //     pct_change_vel_rank: -1,
    //     pct_change_acc_rank: -1
    //   },
		// };
				const updatedSnapshot: ILeaderboardTickerSnapshot = {
			...incomingSnapshot,
			rankings: {
				...incomingSnapshot.rankings,
				recency_rank: isNewEntryChk ? 0 : 1,
			},
		};


		// ================================
		// 📈 Appearance or Absence Tracking
		// ================================
		if (APP_CONFIG_2.leaderboard.useAbsenceBasedTracking) {
			// Reset absence count for tickers that appear
			updatedSnapshot.num_consecutive_absences = 0;
		} else {
			// Increment or initialize appearance count
			updatedSnapshot.num_consecutive_appearances = isNewEntryChk
				? 1
				: (existingSnapshot?.num_consecutive_appearances ?? 0) + 1;
		}

		// ================================
		// ✅ Save updated snapshot
		// ================================
		mergedSnapshotMap.set(symbol, updatedSnapshot);
	}

	return mergedSnapshotMap;
}
