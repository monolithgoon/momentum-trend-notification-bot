import { MarketSession } from "@core/enums/MarketSession.enum.js"
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/models/NormalizedRestTickerSnapshot.interface";

export interface SessionMarketQuoteFetcher {
  fetchData(session: MarketSession): Promise<NormalizedRestTickerSnapshot[]>;
}