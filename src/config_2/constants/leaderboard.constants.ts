// constants.ts

// 🔒 Internal values used by APP_CONFIG_2 — not exported directly elsewhere
const REDIS_SNAPSHOT_LIMIT = 10;
const MIN_SNAPSHOTS_REQUIRED_FOR_KINETICS = 5;
const MAX_SNAPSHOTS_STORED_PER_TICKER = 25;
const LEADERBOARD_SNAPSHOT_STORAGE_RETENTION_LIMIT = 25;
const LEADERBOARD_MAX_LENGTH = 50;

const LEADERBOARD_PRUNE_MODE = {
  AGE_BASED: "age_based",
  INACTIVITY_BASED: "inactivity_based",
} as const;

type LeaderboardPruneMode = typeof LEADERBOARD_PRUNE_MODE[keyof typeof LEADERBOARD_PRUNE_MODE];

const LEADERBOARD_PRUNE_CONFIG: {
  mode: LeaderboardPruneMode;
  maxAgeDays: number;
  maxUnrankedScans: number;
} = {
  mode: LEADERBOARD_PRUNE_MODE.AGE_BASED,
  maxAgeDays: 7,
  maxUnrankedScans: 5,
};

const USE_ABSENCE_BASED_TRACKING = true;

export {
  REDIS_SNAPSHOT_LIMIT,
  MIN_SNAPSHOTS_REQUIRED_FOR_KINETICS,
  MAX_SNAPSHOTS_STORED_PER_TICKER,
  // LEADERBOARD_SNAPSHOT_STORAGE_RETENTION_LIMIT,
  LEADERBOARD_MAX_LENGTH,
  LEADERBOARD_PRUNE_MODE,
  LEADERBOARD_PRUNE_CONFIG,
  USE_ABSENCE_BASED_TRACKING,
  LeaderboardPruneMode,
};
