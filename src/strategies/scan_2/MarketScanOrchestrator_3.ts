import logger from "@infrastructure/logger";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { MarketScanStrategyPresetKey } from "./MarketScanStrategyPresetKey.enum";
import { DedupableKey } from "./__deprecated__MarketScanOrchestrator_3 copy";
import { MarketScanAdapterRegistry } from "./MarketScanAdapterRegistry";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";
import { SortedNormalizedTickerSnapshot } from "@core/models/rest_api/SortedNormalizedTickerSnapshot.interface";
import { AdvancedThresholdConfig, filterByThresholds } from "../filter_2/filterByThresholds";
import { dedupeByField } from "@core/generics/dedupeByField";
import { generateMockSnapshots } from "@core/models/rest_api/mocks/generateMockSnapshots";
import { NormalizedSnapshotSorter } from "../sort/NormalizedSnapshotSorter";

interface OrchestratorContext {
	marketSession: MarketSession;
	correlationId: string;
}

interface ScanRunOptions {
	numericFieldLimiters: AdvancedThresholdConfig<SortedNormalizedTickerSnapshot>;
	dedupField?: DedupableKey<SortedNormalizedTickerSnapshot>;
	marketSession: MarketSession;
	marketScanStrategyPresetKeys: MarketScanStrategyPresetKey[];
	marketDataVendor: MarketDataVendor;
	fieldSorter: NormalizedSnapshotSorter;
}

/**
 * Orchestrates a full market scan:
 * - Fetches raw ticker snapshots using preset strategies
 * - Normalizes, filters, and deduplicates results
 * - Logs snapshot and filtering metadata
 */
export class MarketScanOrchestrator_3 {
	private readonly log = logger.child("MarketScanOrchestrator");

	constructor(private readonly context: OrchestratorContext) {}

	/**
	 * Executes the scan using preset strategies and filters.
	 */
	public async executeScan(options: ScanRunOptions): Promise<SortedNormalizedTickerSnapshot[]> {
		const {
			numericFieldLimiters,
			dedupField = "ticker_symbol__nz_tick",
			marketSession,
			marketScanStrategyPresetKeys,
			marketDataVendor,
			fieldSorter,
		} = options;

		const { correlationId } = this.context;

		// Step 1: Fetch raw normalized snapshots from registry-backed adapters
		const snapshots = await this.getSnapshots(marketDataVendor, marketScanStrategyPresetKeys, marketSession);

		if (!snapshots.length) {
			this.log.warn({ correlationId }, "⚠️ No tickers returned from market data scan");
			// WIP
			// return [];
		}

		// 1b. Generate mock data (for demo/testing)
		const mockSnapshots = generateMockSnapshots(["AAPL", "TSLA"], 3, {
			changePctRange: [0.1, 0.2],
			trend: "increasing",
		});

		// console.log({ mockSnapshots });

		// FIXME -> possibly remove sort_ordinal_idex because it's never applied anywhere
		// Step 2: Apply field-based numeric filters (volume, price, etc.)
		// const filtered = filterByThresholds(snapshots.length ? snapshots : mockSnapshots, numericFieldLimiters);
		const snapshotsWithSortIndex: SortedNormalizedTickerSnapshot[] = snapshots.map((s, idx) => ({
			...s,
			sort_ordinal_index: idx,
		}));

		const filtered = filterByThresholds(snapshotsWithSortIndex, numericFieldLimiters);

		// Step 3: Deduplicate based on specified key (e.g. ticker symbol)
		const deduped = dedupeByField(filtered, dedupField);

		// Step 4: Sort
		const sorted: SortedNormalizedTickerSnapshot[] = fieldSorter.sort(deduped);

		this.log.info(
			{ correlationId, total: snapshots.length, filtered: filtered.length, deduped: deduped.length },
			"✅ Market scan complete"
		);

		return sorted;
	}

	/**
	 * Fetches raw normalized snapshots by running all preset scan strategies for a vendor.
	 */
	private async getSnapshots(
		vendor: MarketDataVendor,
		strategyKeys: MarketScanStrategyPresetKey[],
		marketSession: MarketSession
	): Promise<NormalizedRestTickerSnapshot[]> {
		const vendorAdapterRegistry = new MarketScanAdapterRegistry(vendor);
		const results: NormalizedRestTickerSnapshot[] = [];

		for (const strategyKey of strategyKeys) {
			const adapter = vendorAdapterRegistry.getAdapter(strategyKey);
			const snapshots = await adapter.fetchAndTransform(marketSession);
			results.push(...snapshots);
		}

		this.log.info(
			{
				correlationId: this.context.correlationId,
				fetched: results.length,
				tickers: results.map((s) => s.ticker_symbol__nz_tick),
			},
			`📦 Snapshots fetched via [${vendor}] and normalized`
		);

		return results;
	}
}
