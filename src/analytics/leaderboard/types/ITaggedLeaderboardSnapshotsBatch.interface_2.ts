import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";

export interface ITaggedLeaderboardSnapshotsBatch_2 {
  scan_strategy_tag: string;
  normalized_leaderboard_tickers: ILeaderboardTickerSnapshot_2[];
}