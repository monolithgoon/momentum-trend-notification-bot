import axios from "axios";
import { APP_CONFIG } from "@config/index";
import { nsToUnixSec, safeAPICall } from "@core/utils/index";
import { PolygonRestTickerSnapshot } from "@core/models/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { PolygonRestApiQuoteFetcher } from "../types/PolygonRestApiQuoteFetcher.interface";
import { MarketSession } from "@core/enums/MarketSession.enum";

export class PolygonMarketMoversFetcher implements PolygonRestApiQuoteFetcher {
	private readonly nowUtc = Math.floor(Date.now() / 1000);

	private isPreMarket(tsNs: number): boolean {
		const tradeSec = nsToUnixSec(tsNs);
		return tradeSec < this.nowUtc && tradeSec < APP_CONFIG.MARKET_OPEN_UTC;
	}

	async fetch(marketSession: MarketSession): Promise<PolygonRestTickerSnapshot[]> {
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
				.filter((t: any) => t.lastTradeTimestampNs && this.isPreMarket(t.lastTradeTimestampNs))
				.map(
					(t: any): PolygonRestTickerSnapshot => ({
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
