import axios from "axios";
import { APP_CONFIG } from "../../../../../config";
import { nsToUnixSec, safeAPICall } from "../../../../../utils";
import { MarketDataFetcher } from "../../../types/marketDataFetcher.interface";
import { InternalTickerSnapshot } from "../../../../../data/snapshots/types/internalTickerSnapshot.interface";
import { PolygonTickerSnapshot } from "../../../../../data/snapshots/vendors/polygon/polygonRestSnapshot.interface";
import { TickerSnapshotTransformer } from "src/data/snapshots/transformers/types/tickerSnapshotTransformer.interface";
import { MarketSessions } from "@core/enums/marketSessions.enum";


export class PolygonMarketDataFetcher implements MarketDataFetcher {

constructor(
		private transformer: TickerSnapshotTransformer<PolygonTickerSnapshot>
	) {}

	private static readonly ENDPOINTS = {
		gainers: APP_CONFIG.POLYGON_MARKET_MOVERS_ENDPOINTS.GAINERS,
		losers: APP_CONFIG.POLYGON_MARKET_MOVERS_ENDPOINTS.LOSERS,
		most_active: APP_CONFIG.POLYGON_MARKET_MOVERS_ENDPOINTS.MOST_ACTIVE,
	};

	private isPreMarket(tsNs: number, nowUtc: number): boolean {
		const tradeSec = nsToUnixSec(tsNs);
		return tradeSec < nowUtc && tradeSec < APP_CONFIG.MARKET_OPEN_UTC;
	}

	private async fetchPreMarketMovers(): Promise<PolygonTickerSnapshot[]> {
		const nowUtc = Math.floor(Date.now() / 1000);

		try {
			const [gainersRes, losersRes, activeRes] = await Promise.all([
				safeAPICall(() =>
					axios.get(PolygonMarketDataFetcher.ENDPOINTS.gainers, { params: { apiKey: APP_CONFIG.POLYGON_API_KEY } })
				),
				safeAPICall(() =>
					axios.get(PolygonMarketDataFetcher.ENDPOINTS.losers, { params: { apiKey: APP_CONFIG.POLYGON_API_KEY } })
				),
				safeAPICall(() =>
					axios.get(PolygonMarketDataFetcher.ENDPOINTS.most_active, { params: { apiKey: APP_CONFIG.POLYGON_API_KEY } })
				),
			]);

			const allTickers = [
				...(gainersRes?.data?.tickers || []),
				...(losersRes?.data?.tickers || []),
				...(activeRes?.data?.tickers || []),
			];

			return allTickers
				.filter((t: any) => t.lastTradeTimestampNs && this.isPreMarket(t.lastTradeTimestampNs, nowUtc))
				.map(
					(t: any): PolygonTickerSnapshot => ({
						tickerName: t.tickerName,
						tradingVolumeToday: t.tradingVolumeToday ?? 0,
						priceChangeTodayPerc: t.priceChangeTodayPerc ?? 0,
						lastTradeTimestampNs: t.lastTradeTimestampNs,
						priceChangeTodayAbs: t.priceChangeTodayAbs ?? 0,
						rawTickerSnapshot: t.rawTickerSnapshot,
						currDay: t.currDay,
						prevDay: t.prevDay,
						minute: t.minute,
						lastQuote: t.lastQuote,
						lastTrade: t.lastTrade
					})
				);
		} catch (err) {
			console.error("Failed to fetch Polygon pre-market data:", err);
			return [];
		}
	}

	async getData(session: MarketSessions): Promise<InternalTickerSnapshot[]> {
		switch (session) {
			// Fetch pre-market movers
			case MarketSessions.PRE_MARKET:
				const movers = await this.fetchPreMarketMovers();
				return movers.map((symbolSnapshot) => this.transformer.transform(symbolSnapshot));

			default:
				console.warn(`${session} data fetch not implemented yet.`);
				return [];
		}
	}
}
