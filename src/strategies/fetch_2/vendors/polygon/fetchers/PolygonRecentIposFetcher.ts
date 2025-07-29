import { MarketSession } from "@core/enums/MarketSession.enum";
import { PolygonRestTickerSnapshot } from "@core/models/rest_api/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { PolygonRestApiQuoteFetcher } from "../types/PolygonRestApiQuoteFetcher.interface";

export class PolygonRecentIposFetcher implements PolygonRestApiQuoteFetcher {

  async fetch(marketSession: MarketSession): Promise<PolygonRestTickerSnapshot[]> {
    return [];
  }
} 