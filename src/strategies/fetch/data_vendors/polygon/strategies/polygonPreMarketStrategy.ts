// strategies/fetch-strategy/PolygonPreMarketFetchStrategy.ts

import axios from 'axios';
import { APP_CONFIG } from '@config/index';
import { PolygonFetchStrategy_2 } from '@strategies/fetch/data_vendors/polygon/types/polygonFetchStrategy.interface';
import { nsToUnixSec, safeAPICall } from '@utils/index';
import { PolygonTickerSnapshot } from '../../../../../data/snapshots/vendors/polygon/polygonRestSnapshot.interface';

export class PolygonPreMarketFetchStrategy implements PolygonFetchStrategy_2 {
  private readonly nowUtc = Math.floor(Date.now() / 1000);

  private isPreMarket(tsNs: number): boolean {
    const tradeSec = nsToUnixSec(tsNs);
    return tradeSec < this.nowUtc && tradeSec < APP_CONFIG.MARKET_OPEN_UTC;
  }

  async fetch(): Promise<PolygonTickerSnapshot[]> {
    try {
      const [gainersRes, losersRes, activeRes] = await Promise.all([
        safeAPICall(() =>
          axios.get(APP_CONFIG.POLYGON_MARKET_MOVERS_ENDPOINTS.GAINERS, {
            params: { apiKey: APP_CONFIG.POLYGON_API_KEY }
          })
        ),
        safeAPICall(() =>
          axios.get(APP_CONFIG.POLYGON_MARKET_MOVERS_ENDPOINTS.LOSERS, {
            params: { apiKey: APP_CONFIG.POLYGON_API_KEY }
          })
        ),
        safeAPICall(() =>
          axios.get(APP_CONFIG.POLYGON_MARKET_MOVERS_ENDPOINTS.MOST_ACTIVE, {
            params: { apiKey: APP_CONFIG.POLYGON_API_KEY }
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
      console.error('Failed to fetch Polygon pre-market data:', err);
      return [];
    }
  }
}
