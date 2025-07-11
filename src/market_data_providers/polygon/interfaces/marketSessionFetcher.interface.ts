import { MarketSession } from "../../../config/constants";

export interface MarketSessionFetcher {
  getData(session: MarketSession): Promise<any[]>
}