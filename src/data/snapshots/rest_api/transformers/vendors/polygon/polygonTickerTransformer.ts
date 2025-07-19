import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { PolygonRestTickerSnapshot } from "../../../vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RawRestApTickerTransformer } from "../../types/RawRestApiTickerTransformer.interface";

export class PolygonTickerTransformer implements RawRestApTickerTransformer<PolygonRestTickerSnapshot> {
	transform(snapshot: PolygonRestTickerSnapshot): NormalizedRestTickerSnapshot {
		return {
			timestamp: snapshot.lastTradeTimestampNs,
			ticker: snapshot.tickerName,
			change_pct: snapshot.priceChangeTodayPerc,
			price: snapshot.lastTrade?.p,
			volume: snapshot.tradingVolumeToday,
		};
	}
}
