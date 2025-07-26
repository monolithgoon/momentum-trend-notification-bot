import { PolygonRestTickerSnapshot } from "@core/models/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RestApiQuoteFetchStrategy } from "@services/scan/fetch/types/RestApiQuoteFetchStrategy.interface";

export interface PolygonRestApiQuoteFetchStrategy extends RestApiQuoteFetchStrategy<PolygonRestTickerSnapshot> {}