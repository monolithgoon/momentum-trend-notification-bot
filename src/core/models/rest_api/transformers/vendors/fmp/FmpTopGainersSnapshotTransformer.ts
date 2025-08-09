// import { IRawFmpTopGainersSnapshot } from "@core/models/rest_api/models/vendors/fmp/IRawFmpTopGainersSnapshot.interface";
// import { IEnrichedRawFmpQuoteSnapshot } from "@core/models/rest_api/models/vendors/fmp/IRawFmpQuoteSnapshot.interface";
// import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/models/NormalizedRestTickerSnapshot.interface";
import { IEnrichedRawFmpQuoteSnapshot } from "@core/models/rest_api/vendors/fmp/IRawFmpQuoteSnapshot.interface";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";
import { RawRestApiTckerSnapshotTransformer } from "../../types/RawRestApiTickerSnapshotTransformer.interface";

// export class FmpTopGainersSnapshotTransformer implements RawRestApiTckerSnapshotTransformer<IEnrichedRawFmpQuoteSnapshot> {
// 	transform(
// 		moverQuoteSnapshot: IRawFmpTopGainersSnapshot,
// 		quoteSnapshot?: IRawFmpQuoteSnapshot
// 	): NormalizedRestTickerSnapshot {
// 		const fallbackPrice = quoteSnapshot?.price ?? moverQuoteSnapshot.price;
// 		const fallbackVolume = quoteSnapshot?.volume ?? 0;

// 		return {
// 			ticker_name__nz_tick: moverQuoteSnapshot.name,
// 			ticker_symbol__nz_tick: moverQuoteSnapshot.symbol,

// 			// Final trusted fields
// 			price__nz_tick: fallbackPrice,
// 			change_pct__nz_tick: parsePercentage(moverQuoteSnapshot.changesPercentage),
// 			change_abs__nz_tick: moverQuoteSnapshot.change,
// 			volume__nz_tick: fallbackVolume,

// 			// Maybe unknowns
// 			market_cap__nz_tick: 0,
// 			timestamp_utc__nz_tick: quoteSnapshot?.timestamp ?? Date.now(),
// 			vendor_name__nz_tick: "FMP",

// 			raw_source_snapshot: { mover: moverQuoteSnapshot, quote: quoteSnapshot },
// 			ingestion_ordinal_index: 0,
// 			timestamp__nz_tick: 0,
// 		};
// 	}
// }


/**
 * Parse "+2.45%" string to numeric 2.45
 */
function parsePercentage(pct: string | number): number {
	if (typeof pct === "number") return pct;
	return parseFloat(pct.replace(/[%+]/g, "")) || 0;
}

export class FmpTopGainersSnapshotTransformer implements RawRestApiTckerSnapshotTransformer<IEnrichedRawFmpQuoteSnapshot>{
	readonly VENDOR_NAME: "FMP" = "FMP"
	/**
	 * Transforms a single IEnrichedRawFmpQuoteSnapshot into a NormalizedRestTickerSnapshot
	 */
	transform(m: IEnrichedRawFmpQuoteSnapshot, ingestionOrdinalIndex: number): NormalizedRestTickerSnapshot {
		return {
			ingestion_ordinal_index: ingestionOrdinalIndex,
			timestamp__nz_tick: m.timestamp ?? Date.now(),
			ticker_name__nz_tick: m.name,
			ticker_symbol__nz_tick: m.symbol,
			price__nz_tick: m.price ?? 0,
			change_pct__nz_tick: parsePercentage(m.changesPercentage ?? 0),
			change_abs__nz_tick: m.change ?? 0,
			volume__nz_tick: m.volume ?? 0,
			market_cap__nz_tick: m.marketCap ?? 0,
			vendor_name__nz_tick: this.VENDOR_NAME,
		};
	}
}
