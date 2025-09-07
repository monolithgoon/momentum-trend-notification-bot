/* ----------------------------------------------------------------------------
   🏁 Leaderboard Row (view-model / table row DTO)
---------------------------------------------------------------------------- */

export type TLeaderboardRow = {
  symbol: string;
  score: number;
  rank?: number;
  meta?: Record<string, unknown>;
};
