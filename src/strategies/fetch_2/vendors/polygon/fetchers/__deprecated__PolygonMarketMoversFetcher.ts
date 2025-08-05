import axios from "axios";
import { APP_CONFIG } from "@config/index";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { nsToUnixSec, safeAPICall } from "@core/utils/index";
import { FlatRawPolygonTickerSnapshot } from "@core/models/rest_api/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { PolygonRestApiQuoteFetcher } from "src/strategies/fetch_2/vendors/polygon/types/PolygonRestApiQuoteFetcher.interface";

// src/core/utils/timestampTradeSessionChk.ts

/**
 * Checks if a trade timestamp (in seconds) occurred within the specified market session.
 */
export function timestampTradeSessionChk(tradeSec: number, session: MarketSession, nowUtc: number): boolean {
	switch (session) {
		case MarketSession.PRE_MARKET:
			return tradeSec < nowUtc && tradeSec < APP_CONFIG.MARKET_OPEN_UTC;

		case MarketSession.RTH:
			return tradeSec >= APP_CONFIG.MARKET_OPEN_UTC && tradeSec <= APP_CONFIG.MARKET_CLOSE_UTC;

		case MarketSession.AFTER_MARKET:
			return tradeSec > APP_CONFIG.MARKET_CLOSE_UTC && tradeSec < nowUtc;

		default:
			return false;
	}
}

export class PolygonPremarketMoversFetcher implements PolygonRestApiQuoteFetcher {
	private readonly nowUtc = Math.floor(Date.now() / 1000);

	async fetch(marketSession: MarketSession): Promise<FlatRawPolygonTickerSnapshot[]> {
		try {
			const [gainersRes, losersRes, activeRes] = await Promise.all([
				safeAPICall(() =>
					axios.get(APP_CONFIG.POLYGON_MARKET_MOVERS_ENDPOINTS.GAINERS, {
						params: { apiKey: APP_CONFIG.POLYGON_API_KEY },
					})
				),
				safeAPICall(() =>
					axios.get(APP_CONFIG.POLYGON_MARKET_MOVERS_ENDPOINTS.LOSERS, {
						params: { apiKey: APP_CONFIG.POLYGON_API_KEY },
					})
				),
				safeAPICall(() =>
					axios.get(APP_CONFIG.POLYGON_MARKET_MOVERS_ENDPOINTS.MOST_ACTIVE, {
						params: { apiKey: APP_CONFIG.POLYGON_API_KEY },
					})
				),
			]);

			const allTickers = [
				...(gainersRes?.data?.tickers || []),
				...(losersRes?.data?.tickers || []),
				...(activeRes?.data?.tickers || []),
			];

			return allTickers
				.filter((t: any) => {
					if (!t.lastTradeTimestampNs) return false;
					const tradeSec = nsToUnixSec(t.lastTradeTimestampNs);
					return timestampTradeSessionChk(tradeSec, marketSession, this.nowUtc);
				})
				.map(
					(t: any): FlatRawPolygonTickerSnapshot => ({
						polygon_ticker_name: t.polygon_ticker_name,
						tradingVolumeToday: t.tradingVolumeToday ?? 0,
						priceChangeTodayPerc: t.priceChangeTodayPerc ?? 0,
						lastTradeTimestampNs: t.lastTradeTimestampNs,
						priceChangeTodayAbs: t.priceChangeTodayAbs ?? 0,
						rawTickerSnapshot: t.rawTickerSnapshot,
						currDay: t.currDay,
						prevDay: t.prevDay,
						minute: t.minute,
						lastQuote: t.lastQuote,
						lastTrade: t.lastTrade,
					})
				);
		} catch (err) {
			console.error("Failed to fetch Polygon pre-market data:", err);
			return [];
		}
	}
}
