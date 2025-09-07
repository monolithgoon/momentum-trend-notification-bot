// // Base URL
// export const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";

//  // Endpoint paths (composable)
//  export const FMP_ENDPOINTS = {
//    MARKET_MOVERS: {
//      GAINERS: "/stock_market/gainers",
//      LOSERS: "/stock_market/losers",
//      MOST_ACTIVE: "/stock_market/actives",
//    },

// Base URL
export const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

// // Endpoint paths (composable)
// export const FMP_ENDPOINTS = {
// 	MARKET_MOVERS: {
// 		GAINERS: "/biggest-gainers",
// 		LOSERS: "/biggest-losers",
// 		MOST_ACTIVE: "/most-actives",
// 	},
// 	QUOTE: (symbol: string) => `/quote?symbol=${symbol}`,
// 	HISTORICAL_MINUTE: (symbol: string) => `/historical-chart/1min/${symbol}`,
// 	MARKET_CAP: (symbol: string) => `/market-capitalization/${symbol}`,
// 	PROFILE: (symbol: string) => `/profile/${symbol}`,
// };

// // Full URLs (for direct usage)
// export const FMP_MARKET_MOVERS_URLS = {
// 	GAINERS: `${FMP_BASE_URL}${FMP_ENDPOINTS.MARKET_MOVERS.GAINERS}`,
// 	LOSERS: `${FMP_BASE_URL}${FMP_ENDPOINTS.MARKET_MOVERS.LOSERS}`,
// 	MOST_ACTIVE: `${FMP_BASE_URL}${FMP_ENDPOINTS.MARKET_MOVERS.MOST_ACTIVE}`,
// };

// export const FMP_QUOTES = {
//   SINGLE: (symbol: string) => `${FMP_BASE_URL}${FMP_ENDPOINTS.QUOTE(symbol)}`,
// };

// Base endpoints (relative paths)
export const FMP_PATHS = {
  MARKET_MOVERS: {
    GAINERS: "/biggest-gainers",
    LOSERS: "/biggest-losers",
    ACTIVE: "/most-actives",
  },
  SINGLE_QUOTE: (symbol: string) => `/quote?symbol=${symbol}`,
  BATCH_QUOTE: (symbol: string) => `/batch-quote?symbols=${symbol}`,
  MINUTE_HISTORY: (symbol: string) => `/historical-chart/1min/${symbol}`,
  MARKET_CAP: (symbol: string) => `/market-capitalization/${symbol}`,
  PROFILE: (symbol: string) => `/profile/${symbol}`,
};

// Full URLs (ready-to-use)
export const FMP_URLS = {
  MARKET_MOVERS: {
    GAINERS: `${FMP_BASE_URL}${FMP_PATHS.MARKET_MOVERS.GAINERS}`,
    LOSERS: `${FMP_BASE_URL}${FMP_PATHS.MARKET_MOVERS.LOSERS}`,
    ACTIVE: `${FMP_BASE_URL}${FMP_PATHS.MARKET_MOVERS.ACTIVE}`,
  },
  SINGLE_QUOTE: (symbol: string) => `${FMP_BASE_URL}${FMP_PATHS.SINGLE_QUOTE(symbol)}`,
  BATCH_QUOTE: (symbol: string) => `${FMP_BASE_URL}${FMP_PATHS.BATCH_QUOTE(symbol)}`,
  MINUTE_HISTORY: (symbol: string) => `${FMP_BASE_URL}${FMP_PATHS.MINUTE_HISTORY(symbol)}`,
  MARKET_CAP: (symbol: string) => `${FMP_BASE_URL}${FMP_PATHS.MARKET_CAP(symbol)}`,
  PROFILE: (symbol: string) => `${FMP_BASE_URL}${FMP_PATHS.PROFILE(symbol)}`,
};

// Optional helper to append ?apikey=... or &apikey=...
export function withFmpApiKey(url: string, apiKey: string): string {
	return url.includes("?") ? `${url}&apikey=${apiKey}` : `${url}?apikey=${apiKey}`;
}
