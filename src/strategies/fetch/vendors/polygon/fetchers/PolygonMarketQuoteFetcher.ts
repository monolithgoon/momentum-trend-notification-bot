import { MarketSession } from "@core/enums/MarketSession.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";
import { PolygonRestTickerSnapshot } from "@core/models/rest_api/vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RawRestApiTickerTransformer } from "@core/models/rest_api/transformers/types/RawRestApiTickerTransformer.interface";
import { PolygonRestApiQuoteFetchStrategy } from "../types/PolygonRestApiQuoteFetchStrategy.interface";
import { SessionMarketQuoteFetcher } from "src/strategies/fetch/types/SessionMarketQuoteFetcher.interface";

export class PolygonMarketQuoteFetcher implements SessionMarketQuoteFetcher {
	constructor(
		private readonly transformer: RawRestApiTickerTransformer<PolygonRestTickerSnapshot>,
		private readonly strategies: PolygonRestApiQuoteFetchStrategy[]
	) {}

	async fetchData(marketSession: MarketSession): Promise<NormalizedRestTickerSnapshot[]> {
		switch (marketSession) {
			case MarketSession.PRE_MARKET:
				const allTickerSnapshots: PolygonRestTickerSnapshot[] = [];

				for (const strategy of this.strategies) {
					const result = await strategy.fetch();
					if (result?.length) {
						allTickerSnapshots.push(...result);
					}
				}

				const transformedSnapshots = allTickerSnapshots.map((snapshot, idx) => this.transformer.transform(snapshot, idx));

				// De-duplication
				const seen = new Set();

				return transformedSnapshots.filter((snap) => {
					if (seen.has(snap.ticker_name__nz_tick)) return false;
					seen.add(snap.ticker_name__nz_tick);
					return true;
				});

			default:
				console.warn(`${marketSession} data fetch not yet implemented for POLYGON.`);
				return [];
		}
	}
}
