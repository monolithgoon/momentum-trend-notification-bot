import { RestApiQuoteFetcherAdapter } from "./RestApiQuoteFetcherAdapter.interface";
import { IRestApiQuoteFetcher } from "src/strategies/fetch_2/types/IRestApiQuoteFetcher.interface";
import { FmpTopGainersSnapshotTransformer } from "@core/models/rest_api/transformers/vendors/fmp/FmpTopGainersSnapshotTransformer";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";
import { IEnrichedRawFmpQuoteSnapshot } from "@core/models/rest_api/vendors/fmp/IRawFmpQuoteSnapshot.interface";

export class FmpFetcherAdapter implements RestApiQuoteFetcherAdapter {
	constructor(
		private readonly fetcher: IRestApiQuoteFetcher,
		private readonly transformer: FmpTopGainersSnapshotTransformer
	) { }

	async fetchAndTransform(marketSession: MarketSession): Promise<NormalizedRestTickerSnapshot[]> {
		const rawMoversSnapshots = await this.fetcher.fetch(marketSession);
		return rawMoversSnapshots.map((snapshot: IEnrichedRawFmpQuoteSnapshot, i: number) => this.transformer.transform(snapshot, i));
	}
}
