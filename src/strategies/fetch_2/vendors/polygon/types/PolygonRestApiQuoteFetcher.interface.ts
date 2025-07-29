import { MarketSession } from "@core/enums/MarketSession.enum";
import { PolygonRestTickerSnapshot } from "@core/models/rest_api/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RestApiQuoteFetcher } from "src/strategies/fetch_2/types/RestApiQuoteFetcher.interface";

export interface PolygonRestApiQuoteFetcher extends RestApiQuoteFetcher<PolygonRestTickerSnapshot> {
	fetch(session: MarketSession): Promise<PolygonRestTickerSnapshot[]>;
}
