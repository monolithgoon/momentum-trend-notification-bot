import { RawFmpMarketMoverSnapshot } from "../../../vendors/fmp/FmpMarketMoverSnapshot.interface";
import { RawFmpQuoteSnapshot } from "../../../vendors/fmp/RawFmpQuoteSnapshot";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/models/NormalizedRestTickerSnapshot.interface";

function parsePercentage(pct: string | number): number {
	if (typeof pct === "number") return pct;
	return parseFloat(pct.replace(/[%+]/g, "")) || 0;
}

export class FmpQuoteTransformer {
	transform(
		moverQuoteSnapshot: RawFmpMarketMoverSnapshot,
		quoteSnapshot?: RawFmpQuoteSnapshot
	): NormalizedRestTickerSnapshot {
		const fallbackPrice = quoteSnapshot?.price ?? moverQuoteSnapshot.price;
		const fallbackVolume = quoteSnapshot?.volume ?? 0;

		return {
			ticker_name__nz_tick: moverQuoteSnapshot.name,
			ticker_symbol__nz_tick: moverQuoteSnapshot.symbol,

			// Final trusted fields
			price__nz_tick: fallbackPrice,
			change_pct__nz_tick: parsePercentage(moverQuoteSnapshot.changesPercentage),
			change_abs__nz_tick: moverQuoteSnapshot.change,
			volume__nz_tick: fallbackVolume,

			// // Optional fallbacks and vendor audit trail
			// vendor_price__nz_tick: quoteSnapshot?.price ?? 0,
			// raw_volume__nz_tick: quoteSnapshot?.volume ?? 0,

			// Unknowns
			market_cap__nz_tick: 0,
			timestamp_utc__nz_tick: quoteSnapshot?.timestamp ?? Date.now(),
			vendor_name__nz_tick: "FMP",

			raw_source_snapshot: { mover: moverQuoteSnapshot, quote: quoteSnapshot },
			ingestion_ordinal_index: 0,
			timestamp__nz_tick: 0,
		};
	}

	transformMany(
		movers: RawFmpMarketMoverSnapshot[],
		quoteMap: Record<string, RawFmpQuoteSnapshot>
	): NormalizedRestTickerSnapshot[] {
		return movers.map((m) => this.transform(m, quoteMap[m.symbol]));
	}
}
