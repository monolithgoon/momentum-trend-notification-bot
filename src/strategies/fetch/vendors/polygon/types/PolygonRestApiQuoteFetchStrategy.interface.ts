import { PolygonRestTickerSnapshot } from "@core/models/rest_api/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RestApiQuoteFetchStrategy } from "src/strategies/fetch/types/RestApiQuoteFetchStrategy.interface";

export interface PolygonRestApiQuoteFetchStrategy extends RestApiQuoteFetchStrategy<PolygonRestTickerSnapshot> {}