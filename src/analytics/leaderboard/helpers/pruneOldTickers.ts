import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { APP_CONFIG_2 } from "src/config_2/app_config";

// normalize seconds → ms if needed
function toMs(ts: number): number {
	return ts < 1_000_000_000_000 ? ts * 1000 : ts; // 1e12 ~ ms threshold
}

/**
 * === Leaderboard Pruning Policy ===
 *
 * This function enforces a retention policy for leaderboard tickers on current leaderboard
 * based on the pruning strategy configured in APP_CONFIG_2.
 *
 * 1. **AGE_BASED**
 *    - Purpose: Keep leaderboard clean by removing entries that haven’t been seen recently.
 *    - Rule: Drop any ticker whose last-seen timestamp (`timestamp__ld_tick`) is older
 *      than `pruneConfig.maxAgeDays` from `now`.
 *    - Time handling: Converts stored timestamps to milliseconds if they are in seconds.
 *
 * 2. **INACTIVITY_BASED**
 *    - Purpose: Remove symbols that have been absent for too many scans.
 *    - Rule: Drop any ticker whose `num_consecutive_absences` exceeds
 *      `pruneConfig.maxUnrankedScans`.
 *
 * 3. **Fallback**
 *    - If the prune mode is unrecognized or misconfigured, all tickers are kept.
 *
 * **Why this step matters:**
 * - Keeps leaderboard size stable by preventing accumulation of stale symbols.
 * - Ensures leaderboard metrics reflect current market movers rather than historical ghosts.
 * - Supports different operational modes depending on how "staleness" is defined for the use case.
 */

export function pruneStaleLeaderboardTickers(
	tickers: ILeaderboardTickerSnapshot_2[],
	nowMs: number = Date.now()
): ILeaderboardTickerSnapshot_2[] {
	const { pruneConfig } = APP_CONFIG_2.leaderboard;

	const ageThresholdMs = pruneConfig.maxAgeDays * 24 * 60 * 60 * 1000;
	const maxAbsences = pruneConfig.maxUnrankedScans;

	return tickers.filter((t) => {
		switch (pruneConfig.mode) {
			case "age_based": {
				const lastSeenMs = toMs(t.timestamp__ld_tick ?? 0);
				return nowMs - lastSeenMs <= ageThresholdMs;
			}
			case "inactivity_based": {
				return (t.num_consecutive_absences ?? 0) <= maxAbsences;
			}
			default:
				return true; // keep everything if misconfigured
		}
	});
}
