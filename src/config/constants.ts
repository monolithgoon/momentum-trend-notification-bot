// src/constants.ts
import { MarketDataVendors } from "../core/enums/marketDataVendors.enum";
import { validateWebSocketUrl } from "../utils";

interface AppConstantsInterface {
	DEFAULT_MARKET_DATA_VENDOR: string;
	MARKET_DATA_VENDORS: string[];
	MARKET_OPEN_UTC: number;
	SCAN_DAEMON_INTERVAL_MS: number;
	ASYNC_LIMIT_CEILING: number;
	EMA_LENGTH: number;
	KC_MULTIPLIER: number;
	TREND_WINDOW: number;
	VOLUME_LOOKBACK: number;
	VOLUME_SPIKE_MULTIPLIER: number;
	TREND_THRESHOLD: number;
	MAX_NUM_API_RETRIES: number;
	RETRY_DELAY: number;
	AGGREGATE_LOOKBACK_MINUTES: number;
	PRE_MARKET_MIN_VOLUME: number;
	PRE_MARKET_MIN_CHANGE_PERC: number;
	MAX_CONCURRENT_REQUESTS: number;
	MAX_KC_TICKS: number;
	TICKER_BUFFER_MAX_LENGTH: number;
	REDIS_SNAPSHOT_LIMIT: number;
	MIN_LEADERBOARD_SNAPSHOT_HISTORY_COUNT: number;
	
	// polygon
	POLYGON_BASE_URL: string;
	POLYGON_SOCKET_URL: string;
	POLYGON_MARKET_MOVERS_ENDPOINTS: {
		GAINERS: string;
		LOSERS: string;
		MOST_ACTIVE: string;
	};

	// eohd
	EODHD_LIVE_US_QUOTE_URL: string;
	EODHD_WEBSOCKET_URL: string;
}

export const APP_CONSTANTS: AppConstantsInterface = {
	DEFAULT_MARKET_DATA_VENDOR: MarketDataVendors.POLYGON, // Default vendor for market data
	MARKET_DATA_VENDORS: ["POLYGON", "EODHD"], // Supported

	MARKET_OPEN_UTC: 13 * 3600 + 30 * 60, // 13:30 UTC in seconds
	SCAN_DAEMON_INTERVAL_MS: 1 * 60 * 1000,
	ASYNC_LIMIT_CEILING: 5,
	EMA_LENGTH: 20,
	KC_MULTIPLIER: 2,
	TREND_WINDOW: 5,
	VOLUME_LOOKBACK: 10,
	VOLUME_SPIKE_MULTIPLIER: 2,
	TREND_THRESHOLD: 3,
	MAX_NUM_API_RETRIES: 3,
	RETRY_DELAY: 1000,
	AGGREGATE_LOOKBACK_MINUTES: 60,
	PRE_MARKET_MIN_VOLUME: 100000,
	PRE_MARKET_MIN_CHANGE_PERC: 3,
	MAX_CONCURRENT_REQUESTS: 5,
	MAX_KC_TICKS: 30,
	TICKER_BUFFER_MAX_LENGTH: 200,
	REDIS_SNAPSHOT_LIMIT: 10,
	MIN_LEADERBOARD_SNAPSHOT_HISTORY_COUNT: 2,

	// 🔽 POLYGON and EODHD API Constants
	POLYGON_BASE_URL: "https://api.polygon.io",
	POLYGON_SOCKET_URL: "wss://socket.polygon.io/stocks",

	// Polygon snapshot endpoints
	POLYGON_MARKET_MOVERS_ENDPOINTS: {
		GAINERS: "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers",
		LOSERS: "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/losers",
		MOST_ACTIVE: "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/most_active",
	},

	EODHD_LIVE_US_QUOTE_URL: "https://eodhd.com/api/real-time",
	EODHD_WEBSOCKET_URL: validateWebSocketUrl("wss://ws.eodhistoricaldata.com/ws/us-quote?api_token=demo"),
};