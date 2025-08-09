import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/LeaderboardRestTickerSnapshot.interface";
import { ILbTickerKineticsRankings } from "./ILbTickerKineticsRankings";

export interface RankedLeaderboardTicker extends LeaderboardRestTickerSnapshot {
  rankings: ILbTickerKineticsRankings;
}
