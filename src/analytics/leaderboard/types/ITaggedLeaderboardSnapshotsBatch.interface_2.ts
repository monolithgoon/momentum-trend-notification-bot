import { ILeaderboardTickerSnapshot } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface";

export interface ITaggedLeaderboardSnapshotsBatch_2 {
  scan_strategy_tag: string;
  normalized_leaderboard_tickers: ILeaderboardTickerSnapshot[];
}