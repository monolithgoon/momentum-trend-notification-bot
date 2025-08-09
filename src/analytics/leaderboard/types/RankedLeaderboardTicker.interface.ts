import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/LeaderboardRestTickerSnapshot.interface";
import { ILeaderboardTickerKineticsRanks } from "./ILeaderboardTickerKineticsRanks.interface";

export interface RankedLeaderboardTicker extends LeaderboardRestTickerSnapshot {
  rankings: ILeaderboardTickerKineticsRanks;
  num_consecutive_absences?: number;
}
