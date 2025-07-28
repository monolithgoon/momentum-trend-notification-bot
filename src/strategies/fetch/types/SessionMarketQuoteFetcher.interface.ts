import { MarketSession } from "@core/enums/MarketSession.enum.js"
import { NormalizedRestTickerSnapshot } from "@core/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface.js";

export interface SessionMarketQuoteFetcher {
  fetchData(session: MarketSession): Promise<NormalizedRestTickerSnapshot[]>;
}