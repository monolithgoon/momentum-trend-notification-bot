export enum LeaderboardPruneMode {
  AGE_BASED = "age_based",
  INACTIVITY_BASED = "inactivity_based"
}

export const LEADERBOARD_PRUNE_CONFIG = {
  mode: LeaderboardPruneMode.AGE_BASED, // or INACTIVITY_BASED
  maxAgeDays: 7,
  maxUnrankedScans: 5,
  maxLeaderboardSize: 50
};
