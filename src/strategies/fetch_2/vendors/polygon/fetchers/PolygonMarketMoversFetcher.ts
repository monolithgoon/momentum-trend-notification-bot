import axios from "axios";
import { APP_CONFIG } from "@config/index";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { nsToUnixSec, safeAPICall } from "@core/utils/index";
import { PolygonRestTickerSnapshot } from "@core/models/rest_api/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { PolygonRestApiQuoteFetcher } from "src/strategies/fetch_2/vendors/polygon/types/PolygonRestApiQuoteFetcher.interface";
import { timestampTradeSessionChk } from "@core/utils/timestampTradeSessionChk";

/**
 * Fetches "gainers", "losers", and "most active" tickers from the Polygon API,
 * filters them by the specified market session (pre-market, RTH, after-hours),
 * and transforms them into a consistent `PolygonRestTickerSnapshot[]` format.
 *
 * This class is **session-aware**: the consumer must specify the desired session
 * at runtime (e.g., `MarketSession.PRE_MARKET`) during the `fetch()` call.
 */
export class PolygonMarketMoversFetcher implements PolygonRestApiQuoteFetcher {
	private readonly nowUtc: number = Math.floor(Date.now() / 1000);

	/**
	 * Fetches and returns Polygon market movers filtered by session.
	 *
	 * @param marketSession - Market session to filter by (PRE_MARKET, RTH, AFTER_MARKET)
	 */
	public async fetch(marketSession: MarketSession): Promise<PolygonRestTickerSnapshot[]> {
		try {
			// Parallel API calls for top gainers, losers, and most active
			const [gainersRes, losersRes, activesRes] = await Promise.all([
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

			// Merge all ticker results, guarding against undefined data
			const rawTickers: any[] = [
				...(gainersRes?.data?.tickers ?? []),
				...(losersRes?.data?.tickers ?? []),
				...(activesRes?.data?.tickers ?? []),
			];

			return rawTickers
				.filter((t) => {
					// Only accept tickers with a valid trade timestamp
					if (!t.lastTradeTimestampNs) return false;

					const tradeSec = nsToUnixSec(t.lastTradeTimestampNs);
					return timestampTradeSessionChk(tradeSec, marketSession, this.nowUtc);
				})
				.map(
					(t): PolygonRestTickerSnapshot => ({
						polygon_ticker_symbol: t.polygon_ticker_symbol,
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
			console.error("❌ Failed to fetch Polygon market movers:", err);
			return [];
		}
	}
}
