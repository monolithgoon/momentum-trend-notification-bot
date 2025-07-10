import axios from "axios";
import { APP_CONFIG } from "../../config";
import { nsToUnixSec, safeAPICall } from "../../utils";
import { PolygonTickerSnapshot } from "./interfaces/polygonTicker.interface";
import { MarketSessionFetcher } from "./interfaces/marketSession.interface";
import { MarketSession } from "../../config/constants";

export class PolygonMarketFetcher implements MarketSessionFetcher {
	private static readonly MARKET_OPEN_UTC = 13 * 3600 + 30 * 60; // 13:30 UTC in seconds

	private static readonly ENDPOINTS = {
		gainers: APP_CONFIG.POLYGON_MARKET_MOVERS_ENDPOINTS.GAINERS,
		losers: APP_CONFIG.POLYGON_MARKET_MOVERS_ENDPOINTS.LOSERS,
		most_active: APP_CONFIG.POLYGON_MARKET_MOVERS_ENDPOINTS.MOST_ACTIVE,
	};

	private isPreMarket(tsNs: number, nowUtc: number): boolean {
		const tradeSec = nsToUnixSec(tsNs);
		return tradeSec < nowUtc && tradeSec < PolygonMarketFetcher.MARKET_OPEN_UTC;
	}

	private async fetchPreMarketMovers(): Promise<PolygonTickerSnapshot[]> {
		const nowUtc = Math.floor(Date.now() / 1000);

		try {
			const [gainersRes, losersRes, activeRes] = await Promise.all([
				safeAPICall(() =>
					axios.get(PolygonMarketFetcher.ENDPOINTS.gainers, { params: { apiKey: APP_CONFIG.POLYGON_API_KEY } })
				),
				safeAPICall(() =>
					axios.get(PolygonMarketFetcher.ENDPOINTS.losers, { params: { apiKey: APP_CONFIG.POLYGON_API_KEY } })
				),
				safeAPICall(() =>
					axios.get(PolygonMarketFetcher.ENDPOINTS.most_active, { params: { apiKey: APP_CONFIG.POLYGON_API_KEY } })
				),
			]);

			const allTickers = [
				...(gainersRes?.data?.tickers || []),
				...(losersRes?.data?.tickers || []),
				...(activeRes?.data?.tickers || []),
			];

			return allTickers
				.filter((t: any) => t.lastTradeTimestampNs?.t && this.isPreMarket(t.lastTradeTimestampNs.t, nowUtc))
				.map(
					(t: any): PolygonTickerSnapshot => ({
						tickerName: t.tickerName,
						tradingVolume: t.tradingVolume?.v ?? 0,
						priceChangeTodayPerc: t.priceChangeTodayPerc ?? 0,
						lastTradeTimestampNs: t.lastTradeTimestampNs?.t,
						priceChangeTodayAbs: t.priceChangeTodayAbs ?? null,
					})
				);
		} catch (err) {
			console.error("Failed to fetch Polygon pre-market data:", err);
			return [];
		}
	}

	async getData(session: MarketSession): Promise<PolygonTickerSnapshot[]> {
		switch (session) {
			case MarketSession.PRE_MARKET:
				return this.fetchPreMarketMovers();

			default:
				console.warn(`${session} data fetch not implemented yet.`);
				return [];
		}
	}
}
