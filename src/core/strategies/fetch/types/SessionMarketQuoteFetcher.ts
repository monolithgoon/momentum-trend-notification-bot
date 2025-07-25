import { MarketSessions } from "@core/enums/marketSessions.enum.js"
import { NormalizedRestTickerSnapshot } from "@core/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface.js";

export interface SessionMarketQuoteFetcher {
  getData(session: MarketSessions): Promise<NormalizedRestTickerSnapshot[]>;
}