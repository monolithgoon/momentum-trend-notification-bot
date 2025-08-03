import logger from "@infrastructure/logger";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/models/NormalizedRestTickerSnapshot.interface";
import { generateMockSnapshots } from "@core/models/rest_api/mocks/generateMockSnapshots";
import { GenericDatasetFilter } from "../filter/GenericDatasetFilter.interface";
import { CompositeFilterScreener } from "../filter/CompositeFilterScreener";
import { MarketQuoteScanner } from "./MarketQuoteScanner";
import { MarketQuoteScanner_2 } from "./MarketQuoteScanner_2";
import { dedupeByField } from "@core/generics/dedupeByField";

export interface OrchestratorOptions {
	session: MarketSession;
	correlationId: string;
}

export interface DatasetScreenerConfig<T = any> {
	dataFilter: GenericDatasetFilter<T, NormalizedRestTickerSnapshot>;
	config: T;
}

export class MarketScanOrchestrator {
	private readonly log = logger.child("MarketScanOrchestrator");

	constructor(private readonly opts: OrchestratorOptions) {}

	async run(filters: DatasetScreenerConfig[]): Promise<NormalizedRestTickerSnapshot[]> {
		// 1. Log orchestrator start
		this.log.info({ correlationId: this.opts.correlationId }, "🔍 Running MarketScanOrchestrator");

		// 2. Define scan strategy keys
		const scanStrategyKeys = [
			"Pre-market top movers",
			// "Recent IPO Top Moving",
		];

		// 3. Initialize scanner
		const scanner = new MarketQuoteScanner_2({
			vendor: MarketDataVendor.POLYGON,
			marketSession: this.opts.session,
			strategyKeys: scanStrategyKeys,
		});

		// 4. Run scan and extract tickers
		const returnedSnapshots = await scanner.executeScan();
		const tickers = returnedSnapshots.map((s) => s.ticker_symbol__nz_tick);

		// 5. Bail early if nothing found
		if (!tickers.length) {
			this.log.warn({ correlationId: this.opts.correlationId }, "⚠️ No active tickers found from scan.");
			return [];
		}

		// 6. Log scan result count
		this.log.info(
			{
				correlationId: this.opts.correlationId,
				foundTickers: tickers.length,
			},
			"📈 Tickers returned from scan"
		);

		// 7. Generate mock data (for demo/testing)
		const mockSnapshots = generateMockSnapshots(["AAPL", "TSLA"], 3, {
			changePctRange: [0.1, 0.2],
			trend: "increasing",
		});

		// 8. Run screener with filters
		this.log.info({ correlationId: this.opts.correlationId, filters }, "🔍 Running screener with filters");

		const screener = new CompositeFilterScreener<NormalizedRestTickerSnapshot>(filters);
		// const filtered = screener.runScreener(mockSnapshots, "ticker_symbol__nz_tick");
		const filtered = screener.runScreener(returnedSnapshots, "ticker_symbol__nz_tick");
		const deduped = dedupeByField(filtered, "ticker_symbol__nz_tick");

		// 9. Log final result count
		this.log.info({ correlationId: this.opts.correlationId, found: deduped.length }, "📈 Scan complete");

		// 10. Return filtered, deduped tickers
		return deduped;
	}
}
