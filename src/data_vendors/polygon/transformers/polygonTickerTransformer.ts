import { InternalTickerSnapshot } from "@core/interfaces/internalTickerSnapshot.interface";
import { TickerSnapshotTransformer } from "@core/interfaces/tickerSnapshotTransformer.interface";
import { PolygonTickerSnapshot } from "../types/polygonTickerSnapshot.interface";

export class PolygonTickerTransformer implements TickerSnapshotTransformer<PolygonTickerSnapshot> {
	transform(snapshot: PolygonTickerSnapshot): InternalTickerSnapshot {
		return {
			timestamp: snapshot.lastTradeTimestampNs,
			ticker: snapshot.tickerName,
			changePct: snapshot.priceChangeTodayPerc,
			price: snapshot.lastTrade?.p,
			volume: snapshot.tradingVolumeToday,
		};
	}
}
