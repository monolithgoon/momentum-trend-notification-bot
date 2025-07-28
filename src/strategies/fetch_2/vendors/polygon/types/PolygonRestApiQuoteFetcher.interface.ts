import { PolygonRestTickerSnapshot } from "@core/models/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RestApiQuoteFetcher } from "src/strategies/fetch_2/types/RestApiQuoteFetcher.interface";

export interface PolygonRestApiQuoteFetcher extends RestApiQuoteFetcher<PolygonRestTickerSnapshot> {}