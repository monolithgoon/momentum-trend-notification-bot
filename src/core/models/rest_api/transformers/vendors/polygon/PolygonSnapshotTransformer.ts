import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";
import { FlatRawPolygonTickerSnapshot } from "../../../vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RawRestApiTckerSnapshotTransformer } from "../../types/RawRestApiTickerSnapshotTransformer.interface";

/**
 * Transforms a `FlatRawPolygonTickerSnapshot` into a normalized ticker snapshot.
 * @param snapshot - The raw ticker snapshot from the Polygon API.
 * @param ingestionOrdinalIndex - The ordinal index representing the ingestion order.
 * @returns A `NormalizedRestTickerSnapshot` object containing normalized and computed fields.
 */

export class PolygonSnapshotTransformer implements RawRestApiTckerSnapshotTransformer<FlatRawPolygonTickerSnapshot> {
	readonly VENDOR_NAME: "Polygon" = "Polygon";
	transform(snapshot: FlatRawPolygonTickerSnapshot, ingestionOrdinalIndex: number): NormalizedRestTickerSnapshot {
		return {
			ticker_name__nz_tick: snapshot.polygon_ticker_symbol,
			ticker_symbol__nz_tick: snapshot.polygon_ticker_name,
			ingestion_ordinal_index: ingestionOrdinalIndex,
			timestamp__nz_tick: snapshot.lastTradeTimestampNs,
			change_pct__nz_tick: snapshot.priceChangeTodayPerc,
			price__nz_tick: snapshot.lastTrade?.p,
			volume__nz_tick: snapshot.tradingVolumeToday,
			vendor_name__nz_tick: this.VENDOR_NAME,
		};
	}
}
