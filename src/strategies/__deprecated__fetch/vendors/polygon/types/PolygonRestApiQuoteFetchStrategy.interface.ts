import { FlatRawPolygonTickerSnapshot } from "@core/models/rest_api/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RestApiQuoteFetchStrategy } from "src/strategies/__deprecated__fetch/types/RestApiQuoteFetchStrategy.interface";

export interface PolygonRestApiQuoteFetchStrategy extends RestApiQuoteFetchStrategy<FlatRawPolygonTickerSnapshot> {}