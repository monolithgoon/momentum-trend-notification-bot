import { FetchStrategy } from "@strategies/fetch/types/fetchStrategy.interface"
import { PolygonTickerSnapshot } from "src/data/snapshots/vendors/polygon/polygonRestSnapshot.interface";

export interface PolygonFetchStrategy_2 extends FetchStrategy<PolygonTickerSnapshot> {}