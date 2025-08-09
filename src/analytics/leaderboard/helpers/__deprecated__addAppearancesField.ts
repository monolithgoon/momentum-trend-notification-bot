import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/LeaderboardRestTickerSnapshot.interface";
import { RankedLeaderboardTicker } from "../types/__deprecated__RankedLeaderboardTicker.interface";

export function addAppearancesField(
  currentBatchMap: Map<string, LeaderboardRestTickerSnapshot>
): void {
  for (const ticker of currentBatchMap.values()) {
    ticker.num_consecutive_absences = 0;
  }
}
