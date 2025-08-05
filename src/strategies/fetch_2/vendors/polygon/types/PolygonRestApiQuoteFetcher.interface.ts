import { MarketSession } from "@core/enums/MarketSession.enum";
import { FlatRawPolygonTickerSnapshot } from "@core/models/rest_api/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { IRestApiQuoteFetcher } from "src/strategies/fetch_2/types/IRestApiQuoteFetcher.interface";

export interface PolygonRestApiQuoteFetcher extends IRestApiQuoteFetcher {
// export interface PolygonRestApiQuoteFetcher extends RestApiQuoteFetcher<FlatRawPolygonTickerSnapshot> {
	fetch(session: MarketSession): Promise<FlatRawPolygonTickerSnapshot[]>;
}
