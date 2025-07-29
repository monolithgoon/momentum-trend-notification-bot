import { PolygonRestTickerSnapshot } from "../../../vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RawRestApiTickerTransformer } from "../../types/RawRestApiTickerTransformer.interface";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";

/**
 * Transforms a `PolygonRestTickerSnapshot` object into a normalized ticker snapshot format.
 * 
 * Implements the `RawRestApiTickerTransformer` interface for Polygon vendor data.
 * 
 * @implements {RawRestApiTickerTransformer<PolygonRestTickerSnapshot>}
 */
 
/**
 * Transforms the provided Polygon ticker snapshot into a normalized format.
 *
 * @param snapshot - The raw ticker snapshot from the Polygon API.
 * @param ingestionOrdinalIndex - The ordinal index representing the ingestion order.
 * @returns A `NormalizedRestTickerSnapshot` object containing normalized and computed fields.
 */
export class PolygonSnapshotTransformer implements RawRestApiTickerTransformer<PolygonRestTickerSnapshot> {
	public transform(
		snapshot: PolygonRestTickerSnapshot,
		ingestionOrdinalIndex: number
	): NormalizedRestTickerSnapshot {
		return {
			ingestion_ordinal_index: ingestionOrdinalIndex,
			timestamp: snapshot.lastTradeTimestampNs,
			ticker_name__nz_tick: snapshot.polygon_ticker_name,
			change_pct__nz_tick: snapshot.priceChangeTodayPerc,
			price: snapshot.lastTrade?.p,
			volume: snapshot.tradingVolumeToday,
			// REMOVE ->
			// Computed fields
			// computed_ordinal_index: -1, // Placeholder for computed ordinal index when this ticker is used in for ex. a sort
		};
	}
}
