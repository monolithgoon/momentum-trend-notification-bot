import { InternalTickerSnapshot } from "src/data/snapshots/types/internalTickerSnapshot.interface";
import { TickerSnapshotTransformer } from "src/data/snapshots/transformers/types/tickerSnapshotTransformer.interface";
import { PolygonTickerSnapshot } from "../../../vendors/polygon/polygonRestSnapshot.interface";

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
