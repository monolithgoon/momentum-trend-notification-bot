import { MarketSession } from "../../../config/constants";
import { PolygonTickerSnapshot } from "./polygonTicker.interface";

export interface MarketSessionFetcher {
  getData(session: MarketSession): Promise<PolygonTickerSnapshot[]>
}