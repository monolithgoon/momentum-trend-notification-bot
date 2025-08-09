import { RankedLeaderboardTicker } from "../types/RankedLeaderboardTicker.interface";

export function addAppearancesField(
  currentBatchMap: Map<string, RankedLeaderboardTicker>
): void {
  for (const ticker of currentBatchMap.values()) {
    ticker.num_consecutive_absences = 0;
  }
}
