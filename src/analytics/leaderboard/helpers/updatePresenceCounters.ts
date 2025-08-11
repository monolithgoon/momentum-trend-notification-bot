import { ILeaderboardTickerSnapshot } from "@core/models/rest_api/__deprecatd__ILeaderboardTickerSnapshot.interface";

/**
 * Updates absence and appearance counters for tickers that were present in the previous
 * leaderboard map but are missing from the current scan batch.
 *
 * - Increments `num_consecutive_absences` if a ticker no longer appears in the new batch.
 * - Also increments `num_consecutive_appearances` to track total persistence across scans.
 *
 * If the previous map is empty or undefined, this is a no-op.
 */
export function updatePresenceCounters(
  previousTickersMap: Map<string, ILeaderboardTickerSnapshot> | undefined,
  currentTickersMap: Map<string, ILeaderboardTickerSnapshot>
): void {
  if (!previousTickersMap || previousTickersMap.size === 0) return;

  for (const [symbol, prevTicker] of previousTickersMap.entries()) {
    if (!currentTickersMap.has(symbol)) {
      prevTicker.num_consecutive_absences = (prevTicker.num_consecutive_absences ?? 0) + 1;
      prevTicker.num_consecutive_appearances = (prevTicker.num_consecutive_appearances ?? 0) + 1;
    }
  }
}
