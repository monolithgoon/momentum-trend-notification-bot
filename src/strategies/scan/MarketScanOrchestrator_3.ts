import logger from "@infrastructure/logger";
import { MarketSessions } from "@core/enums/MarketSessions.enum";
import { MarketDataVendors } from "@core/enums/MarketDataVendors.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";
import { generateMockSnapshots } from "@core/models/rest_api/generateMockSnapshots";
import { MarketQuoteScanner_2 } from "./MarketQuoteScanner_2";
import { dedupeByField } from "@core/generics/dedupeByField";
import { AdvancedThresholdConfig, filterByThresholds } from "../filter/filterByThresholds";

interface OrchestratorOptions {
	session: MarketSessions;
	correlationId: string;
}

// src/core/generics/DedupableKey.ts
// Filters only the keys of T where the value is string or number and non-nullable
export type DedupableKey<T> = {
	[K in keyof T]-?: NonNullable<T[K]> extends string ? K : never;
}[keyof T];


export class MarketScanOrchestrator_3 {
	private readonly log = logger.child("MarketScanOrchestrator");
	private returnedSnapshots: NormalizedRestTickerSnapshot[] = [];

	constructor(private readonly ochOptions: OrchestratorOptions) {}

	async run(
		numericThresholdConfig: AdvancedThresholdConfig<NormalizedRestTickerSnapshot>,
		dedupField: DedupableKey<NormalizedRestTickerSnapshot> = "ticker_name__nz_tick"
	): Promise<NormalizedRestTickerSnapshot[]> {
		const { correlationId } = this.ochOptions;

		this.log.info({ correlationId }, "🔍 Starting market scan");

		this.returnedSnapshots = await this.fetchMarketSnapshots();

		// Temporary mock data
		this.returnedSnapshots = generateMockSnapshots(["AAPL", "TSLA"], 3, {
			changePctRange: [0.1, 0.2],
			trend: "increasing",
		});

		this.log.info(
			{
				correlationId,
				fetched: this.returnedSnapshots.length,
				tickers: this.returnedSnapshots.map((s) => s.ticker_name__nz_tick),
			},
			"📦 Raw snapshots fetched"
		);

		if (!this.returnedSnapshots.length) {
			this.log.warn({ correlationId }, "⚠️ No tickers found");
			return [];
		}

		const filtered = filterByThresholds(this.returnedSnapshots, numericThresholdConfig);
		const deduped = dedupeByField(filtered, dedupField);

		this.log.info({ correlationId, found: deduped.length }, "✅ Scan complete");
		return deduped;
	}

	private async fetchMarketSnapshots(): Promise<NormalizedRestTickerSnapshot[]> {
		const scanner = new MarketQuoteScanner_2({
			vendor: MarketDataVendors.POLYGON,
			marketSession: this.ochOptions.session,
			strategyKeys: [
				"Pre-market top movers",
				// "Recent IPO Top Moving",
			], // TODO: move this to options
		});

		const snapshots = await scanner.executeScan();

		this.log.info(
			{
				correlationId: this.ochOptions.correlationId,
				fetched: snapshots.length,
				tickers: snapshots.map((s) => s.ticker_name__nz_tick),
			},
			"📦 Raw snapshots fetched"
		);

		return snapshots;
	}
}
