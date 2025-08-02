// src/constants.ts
import { MarketDataVendor } from "../core/enums/MarketDataVendor.enum";
import { validateWebSocketUrl } from "../core/utils";

// --- App Constants Interface ---
// Grouped by domain and usage for clarity
interface AppConstantsInterface {
	// --- Market Data Vendors ---
	DEFAULT_MARKET_DATA_VENDOR: string;
	MARKET_DATA_VENDORS: string[];

	// --- Market Session Times ---
	MARKET_OPEN_UTC: number;
	MARKET_CLOSE_UTC: number;

	// --- Daemon/Process Control ---
	APP_DAEMON_SAFE_RUN_INTERVAL_MS: number;
	APP_DAEMON_MAX_ALLOWED_CONSECUTIVE_FAILURES: number;

	// --- API/Network ---
	MAX_NUM_API_RETRIES: number;
	RETRY_DELAY: number;
	MAX_CONCURRENT_REQUESTS: number;

	// --- Technical Analysis/Indicators ---
	ASYNC_LIMIT_CEILING: number;
	EMA_LENGTH: number;
	KC_MULTIPLIER: number;
	TREND_WINDOW: number;
	VOLUME_LOOKBACK: number;
	VOLUME_SPIKE_MULTIPLIER: number;
	TREND_THRESHOLD: number;
	AGGREGATE_LOOKBACK_MINUTES: number;
	MAX_KC_TICKS: number;

	// --- Pre-market Filters ---
	PRE_MARKET_MIN_VOLUME: number;
	PRE_MARKET_MIN_CHANGE_PERC: number;

	// --- Web Sockets Connection/Buffers ---
	WEBSOCKET_TICKER_BUFFER_MAX_LENGTH: number;
	WEBSOCKET_RECONNECT_DELAY_MS: number;

	// --- Leaderboard Storage ---
	REDIS_SNAPSHOT_LIMIT: number;
	MIN_LEADERBOARD_TICKER_HISTORY_COUNT: number;

	// --- Polygon API ---
	POLYGON_BASE_URL: string;
	POLYGON_SOCKET_URL: string;
	POLYGON_MARKET_MOVERS_ENDPOINTS: {
		GAINERS: string;
		LOSERS: string;
		MOST_ACTIVE: string;
	};

	// --- EODHD API ---
	EODHD_LIVE_US_QUOTE_URL: string;
	EODHD_WEBSOCKET_URL: string;
}

export const APP_CONSTANTS: AppConstantsInterface = {
	// --- Market Data Vendors ---
	DEFAULT_MARKET_DATA_VENDOR: MarketDataVendor.POLYGON, // Default vendor for market data
	MARKET_DATA_VENDORS: ["POLYGON", "EODHD"], // Supported

	// --- Market Session Times ---
	MARKET_OPEN_UTC: 13 * 3600 + 30 * 60, // 13:30 UTC in seconds
	MARKET_CLOSE_UTC: 20 * 3600, // 20:00 UTC in seconds

	// --- Daemon/Process Control ---
	APP_DAEMON_SAFE_RUN_INTERVAL_MS: 1 * 60 * 1000,
	APP_DAEMON_MAX_ALLOWED_CONSECUTIVE_FAILURES: 5, // Maximum consecutive failures before shutdown

	// --- API/Network ---
	MAX_NUM_API_RETRIES: 3,
	RETRY_DELAY: 1000,
	MAX_CONCURRENT_REQUESTS: 5,

	// --- Technical Analysis/Indicators ---
	ASYNC_LIMIT_CEILING: 5,
	EMA_LENGTH: 20,
	KC_MULTIPLIER: 2,
	TREND_WINDOW: 5,
	VOLUME_LOOKBACK: 10,
	VOLUME_SPIKE_MULTIPLIER: 2,
	TREND_THRESHOLD: 3,
	AGGREGATE_LOOKBACK_MINUTES: 60,
	MAX_KC_TICKS: 30,

	// --- Pre-market Filters ---
	PRE_MARKET_MIN_VOLUME: 100000,
	PRE_MARKET_MIN_CHANGE_PERC: 3,

	// --- Web Sockets Connection/Buffers ---
	WEBSOCKET_TICKER_BUFFER_MAX_LENGTH: 200,
	WEBSOCKET_RECONNECT_DELAY_MS: 5000, // Delay before attempting to reconnect

	// --- Leaderboard Storage ---
	REDIS_SNAPSHOT_LIMIT: 10,
	MIN_LEADERBOARD_TICKER_HISTORY_COUNT: 2,

	// --- Polygon API ---
	POLYGON_BASE_URL: "https://api.polygon.io",
	POLYGON_SOCKET_URL: "wss://socket.polygon.io/stocks",
	POLYGON_MARKET_MOVERS_ENDPOINTS: {
		GAINERS: "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers",
		LOSERS: "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/losers",
		MOST_ACTIVE: "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/most_active",
	},

	// --- EODHD API ---
	EODHD_LIVE_US_QUOTE_URL: "https://eodhd.com/api/real-time",
	EODHD_WEBSOCKET_URL: validateWebSocketUrl("wss://ws.eodhistoricaldata.com/ws/us-quote?api_token=demo"),
};
