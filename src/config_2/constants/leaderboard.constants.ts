// constants.ts

// =======================
// 🔒 Internal Constants
// =======================

const REDIS_SNAPSHOT_LIMIT = 10;
const MIN_SNAPSHOTS_REQUIRED_FOR_KINETICS = 5;
const MAX_SNAPSHOTS_IN_LEADERBOARD_STORAGE_PER_TICKER = 25;
// const LEADERBOARD_SNAPSHOT_STORAGE_RETENTION_LIMIT = 25;
const USE_ABSENCE_BASED_TRACKING = false;

// =======================
// Leaderboard Pruning
// =======================

// allowed modes
const LEADERBOARD_PRUNE_MODES = ["age_based", "inactivity_based"] as const;
type LeaderboardPruneMode = typeof LEADERBOARD_PRUNE_MODES[number];

const LEADERBOARD_PRUNE_CONFIG: {
  mode: LeaderboardPruneMode;
  maxAgeDays: number;
  maxUnrankedScans: number;
} = {
  mode: "age_based",
  maxAgeDays: 7,
  maxUnrankedScans: 5,
};

// =======================
// Leaderboard: Kinetics & Ranking Constants
// =======================

// Kinetics windows
const LEADERBOARD_VEL_WINDOW = 20;  // OLS slope window (bars) for velocity
const LEADERBOARD_ACC_WINDOW = 20;  // OLS slope window (bars) for acceleration (slope of Δy)

// History bounds
const LEADERBOARD_MAX_SNAPSHOT_HISTORY_LOOKBACK: number | undefined = undefined; // if undefined, derived from windows * 6
const LEADERBOARD_MIN_SNAPSHOTS_FOR_KINETICS = 3; // absolute floor; compute fn also uses max(vel,acc)+1

// Guards / denoise
const LEADERBOARD_USE_VELOCITY_GUARD = true;   // if true, suppress accel when pct velocity < minPctChangeVelocity
const LEADERBOARD_MIN_PCT_CHANGE_VELOCITY = 0.02; // small positive slope floor (tune per bar timeframe)

// Leaderboard sizing
const LEADERBOARD_MAX_SNAPSHOT_LENGTH = 50;

/** ── Streak tracking policy ───────────────────────────────────────────────── */
const LEADERBOARD_USE_ABSENCE_BASED_TRACKING = false; // false => appearance-based (reset on miss)

export {
  REDIS_SNAPSHOT_LIMIT,
  MIN_SNAPSHOTS_REQUIRED_FOR_KINETICS,
  MAX_SNAPSHOTS_IN_LEADERBOARD_STORAGE_PER_TICKER,
  LEADERBOARD_PRUNE_CONFIG,
  USE_ABSENCE_BASED_TRACKING,
  // LeaderboardPruneMode,
  LEADERBOARD_VEL_WINDOW,
  LEADERBOARD_ACC_WINDOW,
  LEADERBOARD_MAX_SNAPSHOT_HISTORY_LOOKBACK,
  LEADERBOARD_MIN_SNAPSHOTS_FOR_KINETICS,
  LEADERBOARD_USE_VELOCITY_GUARD,
  LEADERBOARD_MIN_PCT_CHANGE_VELOCITY,
  LEADERBOARD_MAX_SNAPSHOT_LENGTH,
  LEADERBOARD_USE_ABSENCE_BASED_TRACKING
};
