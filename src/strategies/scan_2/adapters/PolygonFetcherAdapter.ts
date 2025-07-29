import { MarketSession } from "@core/enums/MarketSession.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";
import { PolygonTickerTransformer } from "@core/models/transformers/vendors/polygon/PolygonTickerTransformer";
import { PolygonRestTickerSnapshot } from "@core/models/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RestApiQuoteFetcherAdapter, RestApiQuoteFetcherAdapter_0 } from "./RestApiQuoteFetcherAdapter.interface";
import { PolygonRestApiQuoteFetcher } from "src/strategies/fetch_2/vendors/polygon/types/PolygonRestApiQuoteFetcher.interface";

// REMOVE - DEPRECATED
export class PolygonFetcherAdapter_0
	implements RestApiQuoteFetcherAdapter_0<PolygonRestTickerSnapshot, NormalizedRestTickerSnapshot>
{
	constructor(
		private readonly marketSession: MarketSession,
		private readonly fetcher: PolygonRestApiQuoteFetcher,
		private readonly transformer: PolygonTickerTransformer
	) {}

	// export class PolygonFetcherAdapter
	// 	implements RestApiQuoteFetcherAdapter<PolygonRestTickerSnapshot, NormalizedRestTickerSnapshot> {
	// 	private readonly marketSession: MarketSession;
	// 	private readonly fetcher: PolygonRestApiQuoteFetcher;
	// 	private readonly transformer: PolygonTickerTransformer;

	// 	constructor(
	// 		marketSession: MarketSession,
	// 		fetcher: PolygonRestApiQuoteFetcher,
	// 		transformer: PolygonTickerTransformer
	// 	) {
	// 		this.marketSession = marketSession;
	// 		this.transformer = transformer;
	// 		this.fetcher = fetcher;
	// 	}

	transform(payload: PolygonRestTickerSnapshot[]): NormalizedRestTickerSnapshot[] {
		return payload.map((snapshot, index) => this.transformer.transform(snapshot, index));
	}

	async plug(): Promise<NormalizedRestTickerSnapshot[]> {
		const polygonResults: PolygonRestTickerSnapshot[] = await this.fetcher.fetch(this.marketSession);
		return this.transform(polygonResults);
	}
}

/**
 * Adapter for fetching and transforming Polygon ticker snapshots.
 *
 * This adapter retrieves raw ticker data from the Polygon API for a specified market session,
 * then transforms the data into the normalized internal format (`NormalizedRestTickerSnapshot[]`)
 * used throughout the system.
 *
 * Implements:
 * - `RestApiQuoteFetcherAdapter` interface for standardized fetching and transformation.
 *
 * Responsibilities:
 * - Uses a `PolygonRestApiQuoteFetcher` to fetch `PolygonRestTickerSnapshot[]` for a given `MarketSession`.
 * - Applies a `PolygonTickerTransformer` to convert each snapshot into a `NormalizedRestTickerSnapshot`.
 *
 * Example usage:
 * ```typescript
 * const adapter = new PolygonFetcherAdapter(
 *   MarketSession.PRE_MARKET,
 *   fetcher,
 *   transformer
 * );
 * const normalizedSnapshots = await adapter.fetchAndTransform();
 * ```
 *
 * @see PolygonRestApiQuoteFetcher
 * @see PolygonTickerTransformer
 * @see NormalizedRestTickerSnapshot
 */

export class PolygonFetcherAdapter implements RestApiQuoteFetcherAdapter {
	constructor(
		private readonly fetcher: PolygonRestApiQuoteFetcher,
		private readonly transformer: PolygonTickerTransformer
	) {}

	async fetchAndTransform(marketSession: MarketSession): Promise<NormalizedRestTickerSnapshot[]> {
		const rawSnapshots = await this.fetcher.fetch(marketSession);
		return rawSnapshots.map((snapshot, i) => this.transformer.transform(snapshot, i));
	}
}
