import logger from "@infrastructure/logger";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { ScanPresetKey } from "./ScanPresetKey.enum";
import { ScanPresetRegistry } from "./ScanPresetFetchAdapter";
import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";
import { AdvancedThresholdConfig, filterByThresholds } from "../filter/filterByThresholds";
import { dedupeByField } from "@core/generics/dedupeByField";
import { generateMockSnapshots } from "@core/models/rest_api/generateMockSnapshots";
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
	sessionScanPresetKeys: ScanPresetKey[];
	marketDataVendor: MarketDataVendor;
}

export class MarketScanOrchestrator_3 {
	private readonly log = logger.child("MarketScanOrchestrator");
	private returnedSnapshots: NormalizedRestTickerSnapshot[] = [];

	constructor(private readonly ochOptions: OrchestratorOptions) {}

	public async executeScan(options: RunOptions): Promise<NormalizedRestTickerSnapshot[]> {
		const {
			numericFieldLimiters,
			dedupField = "ticker_name__nz_tick",
			marketSession,
			sessionScanPresetKeys,
			marketDataVendor,
		} = options;

		const { correlationId } = this.ochOptions;

		// → Fetch snapshot data using sessionScanPresetKeys, session, and vendor
		const allSnapshots = await this.fetchMarketData(marketDataVendor, sessionScanPresetKeys, marketSession);

		if (!allSnapshots.length) {
			this.log.warn({ correlationId }, "⚠️ No tickers returned from market data scan");
			return [];
		}

		const filtered = filterByThresholds(allSnapshots, numericFieldLimiters);
		const deduped = dedupeByField(filtered, dedupField);

		this.log.info(
			{ correlationId, total: allSnapshots.length, filtered: filtered.length, deduped: deduped.length },
			"✅ Scan complete"
		);

		return deduped;
	}

	// → fetch snapshot data using sessionScanPresetKeys, session, and vendor
	private async fetchMarketData(
		marketDataVendor: MarketDataVendor,
		sessionScanPresetKeys: ScanPresetKey[],
		marketSession: MarketSession
	): Promise<NormalizedRestTickerSnapshot[]> {
		const snapshots: NormalizedRestTickerSnapshot[] = [];
		const presetKey = new ScanPresetRegistry(marketDataVendor);

		for (const key of sessionScanPresetKeys) {
			const adapter = presetKey.getQuoteFetcherAdapter(key);
			const result = await adapter.plug(marketSession);
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
