import logger from "@infrastructure/logger";
import { MarketSessions } from "@core/enums/MarketSessions.enum";
import { MarketDataVendors } from "@core/enums/MarketDataVendors.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";
import { generateMockSnapshots } from "@core/models/rest_api/generateMockSnapshots";
import { GenericDatasetFilter } from "../filter/GenericDatasetFilter.interface";
import { CompositeFilterScreener } from "../filter/CompositeFilterScreener";
import { MarketQuoteScanner_2 } from "./MarketQuoteScanner_2";
import { dedupeByField } from "@core/generics/dedupeByField";

interface OrchestratorOptions {
	session: MarketSessions;
	correlationId: string;
}

export interface DatasetScreenerConfig<TConfig = any> {
	dataFilter: GenericDatasetFilter<TConfig, NormalizedRestTickerSnapshot>;
	config: TConfig;
}

export class MarketScanOrchestrator_2 {
	private readonly log = logger.child("MarketScanOrchestrator");

	constructor(private readonly ochOptions: OrchestratorOptions) {}

	async run(
		fieldThresholdFilters: DatasetScreenerConfig<Partial<Record<keyof NormalizedRestTickerSnapshot, number>>>[] = []
	): Promise<NormalizedRestTickerSnapshot[]> {
		this.log.info({ correlationId: this.ochOptions.correlationId }, "🔍 Orchestrator: begin scan");

		const rawSnapshots = await this.fetchMarketSnapshots();

		if (!rawSnapshots.length) {
			this.log.warn({ correlationId: this.ochOptions.correlationId }, "⚠️ No tickers returned from scan");
			return [];
		}

		// const filtered = this.applyFilters(rawSnapshots, fieldThresholdFilters);
		const screener = new CompositeFilterScreener<NormalizedRestTickerSnapshot>(fieldThresholdFilters);
		const filtered = screener.runScreener(rawSnapshots);
		const deduped = dedupeByField(filtered, "ticker_name__nz_tick");

		this.log.info(
			{
				correlationId: this.ochOptions.correlationId,
				filtered: filtered.length,
				deduped: deduped.length,
			},
			"✅ Scan complete"
		);

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

	// 	private applyFilters(
	// 		data: NormalizedRestTickerSnapshot[],
	// 		fieldThresholdFilters: DatasetScreenerConfig[]
	// 	): NormalizedRestTickerSnapshot[] {
	// 		const screener = new CompositeFilterScreener<NormalizedRestTickerSnapshot>(fieldThresholdFilters);
	// 		return screener.runScreener(data, "ticker_name__nz_tick", data);
	// 	}
}
