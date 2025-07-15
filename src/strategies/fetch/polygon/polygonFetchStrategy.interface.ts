import { FetchStrategy } from "@strategies/fetch/types/fetchStrategy.interface"
import { PolygonTickerSnapshot } from "src/data_vendors/polygon/types/polygonTickerSnapshot.interface";

export interface PolygonFetchStrategy_2 extends FetchStrategy<PolygonTickerSnapshot> {}