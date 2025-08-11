import * as constants from "./constants";
import { ENV } from "./env";

export const APP_CONFIG_2 = {
	env: ENV,
	market: {
		openUtc: constants.MARKET_OPEN_UTC,
		closeUtc: constants.MARKET_CLOSE_UTC,
	},
	daemon: {
		safeRunInterval: constants.APP_DAEMON_SAFE_RUN_INTERVAL_MS,
		maxFailures: constants.APP_DAEMON_MAX_ALLOWED_CONSECUTIVE_FAILURES,
	},
	internet: {
		hosts: constants.DNS_CHECK_HOSTS,
		timeoutMs: constants.DEFAULT_INTERNET_TIMEOUT_MS,
	},
	polygon: {
		baseUrl: constants.POLYGON_BASE_URL,
		endpoints: constants.POLYGON_MARKET_MOVERS_ENDPOINTS,
	},
	fmp: {
		baseUrl: constants.FMP_BASE_URL,
		moversUrls: constants.FMP_MARKET_MOVERS_URLS,
	},
	eodhd: {
		quoteUrl: constants.EODHD_LIVE_US_QUOTE_URL,
		socketUrl: constants.EODHD_WEBSOCKET_URL,
	},
	leaderboard: {
		redisSnapshotRetentionLimit: constants.REDIS_SNAPSHOT_LIMIT,
		minSnapshotsRequiredForKinetics: constants.MIN_SNAPSHOTS_REQUIRED_FOR_KINETICS,
		maxSnapshotsStoredPerTicker: constants.MAX_SNAPSHOTS_IN_LEADERBOARD_STORAGE_PER_TICKER,

		// New additions 👇
		// snapshotStorageRetentionLimit: constants.LEADERBOARD_SNAPSHOT_STORAGE_RETENTION_LIMIT,
		pruneConfig: constants.LEADERBOARD_PRUNE_CONFIG,
		useAbsenceBasedTracking: constants.USE_ABSENCE_BASED_TRACKING,
		velWindow: constants.LEADERBOARD_VEL_WINDOW,
		accWindow: constants.LEADERBOARD_ACC_WINDOW,
		maxSnapshotHistoryLookback: constants.LEADERBOARD_MAX_SNAPSHOT_HISTORY_LOOKBACK,
		useVelocityGuard: constants.LEADERBOARD_USE_VELOCITY_GUARD,
		minPctChangeVelocity: constants.LEADERBOARD_MIN_PCT_CHANGE_VELOCITY,
		maxLeaderboardSnapshotLength: constants.LEADERBOARD_MAX_SNAPSHOT_LENGTH,
	},
	premarket: {
		minVolume: constants.PRE_MARKET_MIN_VOLUME,
		minChangePct: constants.PRE_MARKET_MIN_CHANGE_PERC,
	},
	websocket: {
		bufferMax: constants.WEBSOCKET_TICKER_BUFFER_MAX_LENGTH,
		reconnectDelay: constants.WEBSOCKET_RECONNECT_DELAY_MS,
	},
	indicators: {
		kcMultiplier: constants.KC_MULTIPLIER,
		trendWindow: constants.TREND_WINDOW,
		volumeLookback: constants.VOLUME_LOOKBACK,
		volumeSpikeMultiplier: constants.VOLUME_SPIKE_MULTIPLIER,
		trendThreshold: constants.TREND_THRESHOLD,
		aggregateLookback: constants.AGGREGATE_LOOKBACK_MINUTES,
		maxKcTicks: constants.MAX_KC_TICKS,
	},
};
