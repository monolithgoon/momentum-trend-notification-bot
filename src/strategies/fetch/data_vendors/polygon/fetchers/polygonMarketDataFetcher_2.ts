import { MarketDataFetcher } from "../../../../../core/interfaces/marketDataFetcher.interface";
import { MarketSessions } from "src/core/enums/marketSessions.enum";
import { InternalTickerSnapshot } from "src/core/interfaces/internalTickerSnapshot.interface";
import { PolygonFetchStrategy_2 } from "@strategies/fetch/data_vendors/polygon/types/polygonFetchStrategy.interface";
import { PolygonStrategyKey, polygonFetchStrategyRegistry } from "@strategies/fetch/registries/polygnFetchStrategyRegistry";
import { PolygonTickerSnapshot } from "../types/polygonTickerSnapshot.interface";
import { TickerSnapshotTransformer } from "src/core/interfaces/tickerSnapshotTransformer.interface";

// REMOVE - DEPRECATED
export class PolygonMarketDataFetcher_2 implements MarketDataFetcher {
	private strategy: PolygonFetchStrategy_2;

	constructor(
		private transformer: TickerSnapshotTransformer<PolygonTickerSnapshot>,
		private strategyKey: PolygonStrategyKey
	) {
		const resolvedStrategy = polygonFetchStrategyRegistry[this.strategyKey];

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

export class PolygonMarketDataFetcher_3 implements MarketDataFetcher {
	constructor(
		private readonly transformer: TickerSnapshotTransformer<PolygonTickerSnapshot>,
		private readonly strategies: PolygonFetchStrategy_2[]
	) {}

	async getData(session: MarketSessions): Promise<InternalTickerSnapshot[]> {
		if (session !== MarketSessions.PRE_MARKET) {
			console.warn(`${session} not implemented for POLYGON.`);
			return [];
		}

		const allSnapshots: PolygonTickerSnapshot[] = [];

		for (const strategy of this.strategies) {
			const result = await strategy.fetch();
			if (result?.length) {
				allSnapshots.push(...result);
			}
		}

		const transformed = allSnapshots.map((s) => this.transformer.transform(s));

		// Optional deduplication
		const seen = new Set();
		return transformed.filter((snap) => {
			if (seen.has(snap.ticker)) return false;
			seen.add(snap.ticker);
			return true;
		});
	}
}
