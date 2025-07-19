import { MarketSessions } from "@core/enums/marketSessions.enum.js"
import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface.js";

export interface SessionMarketQuoteFetcher {
  getData(session: MarketSessions): Promise<NormalizedRestTickerSnapshot[]>;
}