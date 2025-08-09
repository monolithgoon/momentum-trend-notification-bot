import { ILeaderboardTickerSnapshot } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface";
import { APP_CONFIG_2 } from "src/config_2/app_config";

/**
 * Prunes stale tickers from the leaderboard based on configured strategy.
 *
 * Strategies:
 * - AGE_BASED: remove if too old (timestamp__ld_tick exceeds maxAgeDays)
 * - INACTIVITY_BASED: remove if too many absences
 */
export function pruneStaleLeaderboardTickers(
	tickers: ILeaderboardTickerSnapshot[],
	now: number = Date.now()
): ILeaderboardTickerSnapshot[] {
	const config = APP_CONFIG_2.leaderboard;
	const { pruneMode, pruneConfig } = config;

	const ageThresholdMs = pruneConfig.maxAgeDays * 24 * 60 * 60 * 1000;
	const maxAbsences = pruneConfig.maxUnrankedScans;

	return tickers.filter((ticker) => {
		// if (pruneMode === config.pruneMode.AGE_BASED) {
		if (pruneMode.AGE_BASED === "age_based") {
			const lastSeen = ticker.timestamp__ld_tick ?? 0;
			const age = now - lastSeen;
			return age <= ageThresholdMs;
		}

		// if (pruneMode === config.pruneMode.INACTIVITY_BASED) {
		if (pruneMode.INACTIVITY_BASED === config.pruneMode.INACTIVITY_BASED) {
			return (ticker.num_consecutive_absences ?? 0) <= maxAbsences;
		}

		return true; // fallback: keep everything
	});
}
