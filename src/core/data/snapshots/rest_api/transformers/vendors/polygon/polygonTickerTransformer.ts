import { NormalizedRestTickerSnapshot } from "@core/data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { PolygonRestTickerSnapshot } from "../../../vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RawRestApiTickerTransformer } from "../../types/RawRestApiTickerTransformer.interface";

export class PolygonTickerTransformer implements RawRestApiTickerTransformer<PolygonRestTickerSnapshot> {
	transform(snapshot: PolygonRestTickerSnapshot, sortRank: number): NormalizedRestTickerSnapshot {
		return {
			timestamp: snapshot.lastTradeTimestampNs,
			ticker: snapshot.tickerName,
			change_pct: snapshot.priceChangeTodayPerc,
			price: snapshot.lastTrade?.p,
			volume: snapshot.tradingVolumeToday,
			ordinal_sort_position: sortRank,
		};
	}
}
