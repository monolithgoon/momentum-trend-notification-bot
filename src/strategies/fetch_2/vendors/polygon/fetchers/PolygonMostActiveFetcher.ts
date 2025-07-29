import axios from "axios";
import { APP_CONFIG } from "@config/index";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { nsToUnixSec, safeAPICall } from "@core/utils/index";
import { PolygonRestTickerSnapshot } from "@core/models/rest_api/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { PolygonRestApiQuoteFetcher } from "../types/PolygonRestApiQuoteFetcher.interface";
import { timestampTradeSessionChk } from "@core/utils/timestampTradeSessionChk";

export class PolygonMostActiveFetcher implements PolygonRestApiQuoteFetcher {
  private readonly nowUtc = Math.floor(Date.now() / 1000);

  public async fetch(session: MarketSession): Promise<PolygonRestTickerSnapshot[]> {
    try {
      const res = await safeAPICall(() =>
        axios.get(APP_CONFIG.POLYGON_MARKET_MOVERS_ENDPOINTS.MOST_ACTIVE, {
          params: { apiKey: APP_CONFIG.POLYGON_API_KEY },
        })
      );

      const tickers: any[] = res?.data?.tickers ?? [];

      return tickers
        .filter(t => t.lastTradeTimestampNs && timestampTradeSessionChk(nsToUnixSec(t.lastTradeTimestampNs), session, this.nowUtc))
        .map((t): PolygonRestTickerSnapshot => ({
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
        }));
    } catch (err) {
      console.error("❌ Failed to fetch most active tickers:", err);
      return [];
    }
  }
}
