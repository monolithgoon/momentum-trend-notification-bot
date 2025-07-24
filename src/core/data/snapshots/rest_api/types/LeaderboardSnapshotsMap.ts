import { LeaderboardRestTickerSnapshot } from "./LeaderboardRestTickerSnapshot.interface";
import { NormalizedRestTickerSnapshot } from "./NormalizedRestTickerSnapshot.interface";

export interface LeaderboardSnapshotsMap {
  scan_strategy_tag: string;
  normalized_leaderboard_tickers: LeaderboardRestTickerSnapshot[];
}