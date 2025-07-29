import { MarketSession } from "@core/enums/MarketSession.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";
import { PolygonTickerTransformer } from "@core/models/transformers/vendors/polygon/PolygonTickerTransformer";
import { PolygonRestTickerSnapshot } from "@core/models/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RestApiQuoteFetcherAdapter, RestApiQuoteFetcherAdapter_0 } from "./RestApiQuoteFetcherAdapter.interface";
import { PolygonRestApiQuoteFetcher } from "src/strategies/fetch_2/vendors/polygon/types/PolygonRestApiQuoteFetcher.interface";


/**
 * Adapter to fetch and convert PolygonRestTickerSnapshot[] to NormalizedRestTickerSnapshot[]
 * 
 * Adapter that fetches Polygon ticker data for a given market session and transforms it
 * into the normalized internal format used throughout the system.
 *
 * Implements the `RestApiQuoteFetcherAdapter` interface.
 *
 * Responsibilities:
 * - Uses a vendor-specific `PolygonRestApiQuoteFetcher` to retrieve raw ticker snapshots
 * - Applies a `PolygonTickerTransformer` to convert them into `NormalizedRestTickerSnapshot[]`
 *
 * @usage
 * const adapter = new PolygonFetcherAdapter(fetcher, transformer);
 * const normalizedSnapshots = await adapter.fetch(MarketSession.PRE_MARKET);
 */


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

export class PolygonFetcherAdapter implements RestApiQuoteFetcherAdapter {
	constructor(
		private readonly marketSession: MarketSession,
		private readonly fetcher: PolygonRestApiQuoteFetcher,
		private readonly transformer: PolygonTickerTransformer
	) {}

	async fetchAndTransform(): Promise<NormalizedRestTickerSnapshot[]> {
		const raw = await this.fetcher.fetch(this.marketSession);
		return raw.map((snapshot, i) => this.transformer.transform(snapshot, i));
	}
}
