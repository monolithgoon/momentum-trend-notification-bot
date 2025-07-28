import { ScanPresetKey } from "./ScanPresetKey.enum"

import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { MarketSession } from "@core/enums/MarketSession.enum";

import { PolygonRestTickerSnapshot } from "@core/models/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";
import { PolygonTickerTransformer } from "@core/models/transformers/vendors/polygon/PolygonTickerTransformer";

import { PolygonPremarketMoversFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonPremarketMoversFetcher";
import { PolygonRecentIposFetcher } from "../fetch_2/vendors/polygon/fetchers/PolygonRecentIposFetcher";

export interface RestApiQuoteFetcher<T> {
	fetch(session: MarketSession): Promise<T[]>;
}

export interface RestApiQuoteFetcherAdapter<TInput, TOutput> {
	transform(payload: TInput[]): TOutput[];
	plug(session: MarketSession): Promise<TOutput[]>;
}

export interface PolygonRestApiQuoteFetcher extends RestApiQuoteFetcher<PolygonRestTickerSnapshot> {
	fetch(session: MarketSession): Promise<PolygonRestTickerSnapshot[]>;
}

export class ScanPresetRegistry {
	private scanPresetMap: Record<
		ScanPresetKey,
		RestApiQuoteFetcherAdapter<PolygonRestTickerSnapshot, NormalizedRestTickerSnapshot>
	>;

	constructor(vendor: MarketDataVendor) {
		this.scanPresetMap = this.loadVendorFetcherAdapters(vendor);
	}

	private loadVendorFetcherAdapters(
		vendor: MarketDataVendor
	): Record<ScanPresetKey, RestApiQuoteFetcherAdapter<PolygonRestTickerSnapshot, NormalizedRestTickerSnapshot>> {
		switch (vendor) {
			case MarketDataVendor.POLYGON:
				return {
					[ScanPresetKey.PREMARKET_TOP_MOVERS]: new PolygonFetcherAdapter(
						MarketSession.PRE_MARKET,
						new PolygonPremarketMoversFetcher(),
						new PolygonTickerTransformer()
					),
					[ScanPresetKey.RECENT_IPO]: new PolygonFetcherAdapter(
						MarketSession.RTH,
						// You must ensure PolygonRecentIposFetcher implements PolygonRestApiQuoteFetcher
						new PolygonRecentIposFetcher(), // Assuming this is a valid fetcher for the pre market session
						new PolygonTickerTransformer()
					),
				};
			// Add other vendors here
			default:
				throw new Error(`Unknown vendor: ${vendor}`);
		}
	}

	getQuoteFetcherAdapter(
		key: ScanPresetKey
	): RestApiQuoteFetcherAdapter<PolygonRestTickerSnapshot, NormalizedRestTickerSnapshot> {
		const quoteFetcher = this.scanPresetMap[key];
		if (!quoteFetcher) throw new Error(`Fetcher not found for this scan preset: ${key}`);
		return quoteFetcher;
	}
}

// Adapter to fetch and convert PolygonRestTickerSnapshot[] to NormalizedRestTickerSnapshot[]
export class PolygonFetcherAdapter
	implements RestApiQuoteFetcherAdapter<PolygonRestTickerSnapshot, NormalizedRestTickerSnapshot>
{
	private readonly marketSession: MarketSession;
	private readonly fetcher: PolygonRestApiQuoteFetcher;
	private readonly transformer: PolygonTickerTransformer;

	constructor(
		marketSession: MarketSession,
		fetcher: PolygonRestApiQuoteFetcher,
		transformer: PolygonTickerTransformer
	) {
		this.marketSession = marketSession;
		this.transformer = transformer;
		this.fetcher = fetcher;
	}

	transform(payload: PolygonRestTickerSnapshot[]): NormalizedRestTickerSnapshot[] {
		return payload.map((snapshot, index) => this.transformer.transform(snapshot, index));
	}

	async plug(): Promise<NormalizedRestTickerSnapshot[]> {
		const polygonResults: PolygonRestTickerSnapshot[] = await this.fetcher.fetch(this.marketSession);
		return this.transform(polygonResults);
	}
}
