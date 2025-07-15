import { MarketDataFetcher } from "../../../core/interfaces/marketDataFetcher.interface";
import { MarketSessions } from "src/core/enums/marketSessions.enum";
import { InternalTickerSnapshot } from "src/core/interfaces/internalTickerSnapshot.interface";
import { PolygonFetchStrategy_2 } from "@strategies/fetch/polygon/polygonFetchStrategy.interface";
import { PolygonStrategyKey, polygonStrategyRegistry } from "@strategies/fetch/polygon/polygnFetchStrategyRegistry";
import { PolygonTickerSnapshot } from "../types/polygonTickerSnapshot.interface";
import { TickerSnapshotTransformer } from "src/core/interfaces/tickerSnapshotTransformer.interface";

export class PolygonMarketDataFetcher_2 implements MarketDataFetcher {
	private strategy: PolygonFetchStrategy_2;

	constructor(
		private transformer: TickerSnapshotTransformer<PolygonTickerSnapshot>,
		private strategyKey: PolygonStrategyKey
	) {
		const resolvedStrategy = polygonStrategyRegistry[this.strategyKey];

		if (!resolvedStrategy) {
			throw new Error(`Unknown strategy key: ${this.strategyKey}`);
		}

		this.strategy = resolvedStrategy;
	}

	async getData(marketSession: MarketSessions): Promise<InternalTickerSnapshot[]> {
		switch (marketSession) {
			case MarketSessions.PRE_MARKET:
				const rawSnapshots = await this.strategy.fetch();

				if (!rawSnapshots?.length) {
					console.warn("No pre-market movers found.");
					return [];
				}

				return rawSnapshots.map((snapshot) => this.transformer.transform(snapshot));

			default:
				console.warn(`${marketSession} data fetch not implemented yet.`);
				return [];
		}
	}
}
