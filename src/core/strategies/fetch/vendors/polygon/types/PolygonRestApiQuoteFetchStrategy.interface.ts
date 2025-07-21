import { RestApiQuoteFetchStrategy } from "@core/strategies/fetch/types/RestApiQuoteFetchStrategy.interface"
import { PolygonRestTickerSnapshot } from "@core/data/snapshots/rest_api/vendors/polygon/PolygonRestTickerSnapshot.interface";

export interface PolygonRestApiQuoteFetchStrategy extends RestApiQuoteFetchStrategy<PolygonRestTickerSnapshot> {}