import { MarketSession } from "@core/enums/MarketSession.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";

// REMVOE - DEPRECATED
export interface RestApiQuoteFetcherAdapter_0<TInput, TOutput> {
	transform(payload: TInput[]): TOutput[];
	plug(session: MarketSession): Promise<TOutput[]>;
}

/**
 * Standard interface for fetching normalized ticker snapshots
 * from a vendor-specific adapter.
 */
export interface RestApiQuoteFetcherAdapter {
	fetchAndTransform(marketSession: MarketSession): Promise<NormalizedRestTickerSnapshot[]>;
}
