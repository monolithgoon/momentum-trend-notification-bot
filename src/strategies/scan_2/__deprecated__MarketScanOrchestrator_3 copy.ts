import logger from "@infrastructure/logger";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { MarketScanStrategyPresetKey } from "./MarketScanStrategyPresetKey.enum";
import { MarketScanAdapterRegistry } from "./MarketScanAdapterRegistry";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";
import { AdvancedThresholdConfig, filterByThresholds } from "../filter_2/filterByThresholds";
import { dedupeByField } from "@core/generics/dedupeByField";
import { generateMockSnapshots } from "@core/rest_api/rest_api/generateMockSnapshots";
import { MarketQuoteScanner_2 } from "../scan/MarketQuoteScanner_2";

interface OrchestratorOptions {
	session: MarketSession;
	correlationId: string;
}

// src/core/generics/DedupableKey.ts
// Filters only the keys of T where the value is string or number and non-nullable
export type DedupableKey<T> = {
	[K in keyof T]-?: NonNullable<T[K]> extends string ? K : never;
}[keyof T];

interface RunOptions {
	numericFieldLimiters: AdvancedThresholdConfig<NormalizedRestTickerSnapshot>;
	dedupField?: DedupableKey<NormalizedRestTickerSnapshot>;
	marketSession: MarketSession;
	marketScanStrategyPresetKeys: MarketScanStrategyPresetKey[];
	marketDataVendor: MarketDataVendor;
}

export class MarketScanOrchestrator_3 {
	private readonly log = logger.child("MarketScanOrchestrator");

	constructor(private readonly ochOptions: OrchestratorOptions) {}

	public async executeScan(options: RunOptions): Promise<NormalizedRestTickerSnapshot[]> {
		const {
			numericFieldLimiters,
			dedupField = "ticker_name__nz_tick",
			marketSession,
			marketScanStrategyPresetKeys,
			marketDataVendor,
		} = options;

		const { correlationId } = this.ochOptions;

		// → Fetch snapshot data using marketScanStrategyPresetKeys, session, and vendor
		const returnedSnapshots = await this.fetchMarketData(marketDataVendor, marketScanStrategyPresetKeys, marketSession);

		if (!returnedSnapshots.length) {
			this.log.warn({ correlationId }, "⚠️ No tickers returned from market data scan");
			return [];
		}

		const filtered = filterByThresholds(returnedSnapshots, numericFieldLimiters);
		const deduped = dedupeByField(filtered, dedupField);

		this.log.info(
			{ correlationId, total: returnedSnapshots.length, filtered: filtered.length, deduped: deduped.length },
			"✅ Scan complete"
		);

		return deduped;
	}

	// → fetch snapshot data using marketScanStrategyPresetKeys, session, and vendor
	private async fetchMarketData(
		marketDataVendor: MarketDataVendor,
		marketScanStrategyPresetKeys: MarketScanStrategyPresetKey[],
		marketSession: MarketSession
	): Promise<NormalizedRestTickerSnapshot[]> {
		const snapshots: NormalizedRestTickerSnapshot[] = [];
		const ar = new MarketScanAdapterRegistry(marketDataVendor);

		for (const key of marketScanStrategyPresetKeys) {
			const adapter = ar.getAdapter(key);
			const result = await adapter.fetchAndTransform(marketSession);
			snapshots.push(...result);
		}

		this.log.info(
			{
				correlationId: this.ochOptions.correlationId,
				fetched: snapshots.length,
				tickers: snapshots.map((s) => s.ticker_name__nz_tick),
			},
			`📦 Raw snapshots fetched via **${marketDataVendor}** and transformed (normalized)`
		);

		return snapshots;
	}
}
