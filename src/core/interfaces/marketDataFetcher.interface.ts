import { MarketSessions } from "../enums/marketSessions.enum.js"
import { InternalTickerSnapshot } from "./internalTickerSnapshot.interface.js";

export interface MarketDataFetcher {
  getData(session: MarketSessions): Promise<InternalTickerSnapshot[]>;
}