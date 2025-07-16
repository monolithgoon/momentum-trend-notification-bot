import { MarketSessions } from "../../../core/enums/marketSessions.enum.js"
import { InternalTickerSnapshot } from "../../../data/snapshots/types/internalTickerSnapshot.interface.js";

export interface MarketDataFetcher {
  getData(session: MarketSessions): Promise<InternalTickerSnapshot[]>;
}