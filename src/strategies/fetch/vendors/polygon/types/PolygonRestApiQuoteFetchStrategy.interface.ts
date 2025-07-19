import { RestApiQuoteFetchStrategy } from "@strategies/fetch/types/RestApiQuoteFetchStrategy.interface"
import { PolygonRestTickerSnapshot } from "@data/snapshots/rest_api/vendors/polygon/PolygonRestTickerSnapshot.interface";

export interface PolygonRestApiQuoteFetchStrategy extends RestApiQuoteFetchStrategy<PolygonRestTickerSnapshot> {}