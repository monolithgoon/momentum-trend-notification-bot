import { LeaderboardRestTickerSnapshot } from "./LeaderboardRestTickerSnapshot.interface";

export interface ITaggedLeaderboardSnapshotsBatch {
  scan_strategy_tag: string;
  normalized_leaderboard_snapshots: LeaderboardRestTickerSnapshot[];
}