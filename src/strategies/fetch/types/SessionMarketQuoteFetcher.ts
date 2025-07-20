import { MarketSessions } from "@core/enums/marketSessions.enum";
import { NormalizedRestTickerSnapshot } from "@core/types/NormalizedRestTickerSnapshot.interface";

export interface SessionMarketQuoteFetcher {
  getData(session: MarketSessions): Promise<NormalizedRestTickerSnapshot[]>;
}