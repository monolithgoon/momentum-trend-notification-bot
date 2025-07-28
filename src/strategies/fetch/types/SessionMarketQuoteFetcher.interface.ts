import { MarketSessions } from "@core/enums/MarketSessions.enum.js"
import { NormalizedRestTickerSnapshot } from "@core/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface.js";

export interface SessionMarketQuoteFetcher {
  fetchData(session: MarketSessions): Promise<NormalizedRestTickerSnapshot[]>;
}