import { SessionMarketQuoteFetcher } from "../../../types/SessionMarketQuoteFetcher";
import { PolygonRestApiQuoteFetchStrategy } from "@strategies/fetch/vendors/polygon/types/PolygonRestApiQuoteFetchStrategy.interface";
import { RawRestApiTickerTransformer } from "@data/snapshots/rest_api/transformers/types/RawRestApiTickerTransformer.interface";
import { MarketSessions } from "@core/enums/marketSessions.enum";
import { NormalizedRestTickerSnapshot } from "@core/types/NormalizedRestTickerSnapshot.interface";
import { PolygonRestTickerSnapshot } from "@data/snapshots/rest_api/vendors/polygon/PolygonRestTickerSnapshot.interface";

export class PolygonMarketQuoteFetcher implements SessionMarketQuoteFetcher {
	constructor(
		private readonly transformer: RawRestApiTickerTransformer<PolygonRestTickerSnapshot>,
		private readonly strategies: PolygonRestApiQuoteFetchStrategy[]
	) {}

	async getData(marketSession: MarketSessions): Promise<NormalizedRestTickerSnapshot[]> {
		switch (marketSession) {
			case MarketSessions.PRE_MARKET:
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
					if (seen.has(snap.ticker)) return false;
					seen.add(snap.ticker);
					return true;
				});

			default:
				console.warn(`${marketSession} data fetch not yet implemented for POLYGON.`);
				return [];
		}
	}
}
