// Base URL
export const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";

// Endpoint paths (composable)
export const FMP_ENDPOINTS = {
  MARKET_MOVERS: {
    GAINERS: "/stock_market/gainers",
    LOSERS: "/stock_market/losers",
    MOST_ACTIVE: "/stock_market/actives",
  },
  QUOTE: (symbol: string) => `/quote/${symbol}`,
  HISTORICAL_MINUTE: (symbol: string) => `/historical-chart/1min/${symbol}`,
  MARKET_CAP: (symbol: string) => `/market-capitalization/${symbol}`,
  PROFILE: (symbol: string) => `/profile/${symbol}`,
};

// Full URLs (for direct usage)
export const FMP_MARKET_MOVERS_URLS = {
  GAINERS: `${FMP_BASE_URL}${FMP_ENDPOINTS.MARKET_MOVERS.GAINERS}`,
  LOSERS: `${FMP_BASE_URL}${FMP_ENDPOINTS.MARKET_MOVERS.LOSERS}`,
  MOST_ACTIVE: `${FMP_BASE_URL}${FMP_ENDPOINTS.MARKET_MOVERS.MOST_ACTIVE}`,
};

// Optional helper to append ?apikey=... or &apikey=...
export function withFmpApiKey(url: string, apiKey: string): string {
  return url.includes("?")
    ? `${url}&apikey=${apiKey}`
    : `${url}?apikey=${apiKey}`;
}
