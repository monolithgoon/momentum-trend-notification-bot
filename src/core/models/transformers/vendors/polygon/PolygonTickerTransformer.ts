import { PolygonRestTickerSnapshot } from "../../../vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RawRestApiTickerTransformer } from "../../types/RawRestApiTickerTransformer.interface";
import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";

export class PolygonTickerTransformer implements RawRestApiTickerTransformer<PolygonRestTickerSnapshot> {
	transform(snapshot: PolygonRestTickerSnapshot, ingestion_ordinal_position: number): NormalizedRestTickerSnapshot {
		return {
			timestamp: snapshot.lastTradeTimestampNs,
			ticker_name__nz_tick: snapshot.polygon_ticker_name,
			change_pct__nz_tick: snapshot.priceChangeTodayPerc,
			price: snapshot.lastTrade?.p,
			volume: snapshot.tradingVolumeToday,
			ordinal_sort_position: ingestion_ordinal_position,
		};
	}
}
