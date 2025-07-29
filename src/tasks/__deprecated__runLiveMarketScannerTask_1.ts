// Config
import { APP_CONFIG } from "@config/index";

// Core Utilities & Enums
import { formatSessionLabel, getCurrentMarketSession } from "../core/utils";
import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { SortOrder } from "@core/enums/SortOrder.enum";

// Core Models & Types
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";
import { SortedNormalizedTickerSnapshot } from "@core/models/rest_api/SortedNormalizedTickerSnapshot.interface";
import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/LeaderboardRestTickerSnapshot.interface";
import { LeaderboardSnapshotsMap } from "@core/models/rest_api/LeaderboardSnapshotsMap";
import { ScanFilterConfigTypes } from "src/strategies/scan/types/ScanFilterConfigs.types";

// Core Generics & Transformers
import { GenericSorter } from "@core/generics/GenericSorter";
import { LeaderboardTickerTransformer } from "@core/models/rest_api/transformers/LeaderboardTickerTransformer";

// Scan Services
import { MarketQuoteScanner } from "src/strategies/scan/MarketQuoteScanner";
import { PriceChangeScanFilter, VolumeChangeScanFilter } from "src/strategies/filter/normalizedTickerScanFilters";

// Notifier Services
import { NotifierService } from "@services/notifier/NotifierService";
import { TelegramNotifier } from "@services/notifier/TelegramService";

// Leaderboard Services
import { FileLeaderboardStorage } from "@services/leaderboard/FileLeaderboardStorage";
import { LeaderboardTickersSorter } from "@services/leaderboard/LeaderboardTickersSorter";
import { LeaderboardService } from "@services/leaderboard/LeaderboardService";
import { scoringStrategies } from "@services/leaderboard/scoringStrategies";

// WebSocket Services
import handleWebSocketTickerUpdate from "@services/websocket/handleWebSocketTickerUpdate";
import { EODHDWebSocketClient } from "@services/websocket/eodhd/eodhdWebSocketClient";

// Mock Data Generators
import { generateMockSnapshots } from "@core/rest_api/rest_api/generateMockSnapshots";
import { LeaderboardSortFieldType, NORMALIZED_SORT_FIELDS, NormalizedSortableFieldType } from "@core/models/snapshotFieldTypeAssertions";

/**
 * Adds a tag to the market scan result.
 */
function tagSnapshotsWithStrategyMeta(
	tickers: LeaderboardRestTickerSnapshot[],
	scan_strategy_tag: string = "OK"
): LeaderboardSnapshotsMap {
	return {
		scan_strategy_tag,
		normalized_leaderboard_tickers: tickers.map((ticker) => ({
			...ticker,
		})),
	};
}

/**
 * Composes a string tag from scan strategy keys.
 */
function composeScanStrategyTag(scanStrategyKeys: string[]): string {
	return Array.isArray(scanStrategyKeys) ? scanStrategyKeys.join("_") : String(scanStrategyKeys);
}

/**
 * Adds rank fields to the ticker snapshots.
 */
function addRankFields(snapshots: NormalizedRestTickerSnapshot[]): SortedNormalizedTickerSnapshot[] {
	return snapshots.map((snapshot, index) => ({
		...snapshot,
		ordinal_sort_position: index,
	}));
}

/**
 * Builds screener configs for the scan.
 */
function buildScreenerConfigs(): ScanFilterConfigTypes[] {
	return [
		{
			scanFilter: new VolumeChangeScanFilter(),
			config: { volumeThreshold: 1_000_000, changePercentageThreshold: 3 },
		},
		{ scanFilter: new PriceChangeScanFilter(), config: { minPriceJump: 2.5 } },
	];
}

/**
 * Executes the market scan and returns the found ticker snapshots.
 */
async function ochestrateMarketScan(
	currentMarketSession: string,
	scanStrategyKeys: string[]
): Promise<NormalizedRestTickerSnapshot[]> {
	const scanner = new MarketQuoteScanner({
		vendor: MarketDataVendor.POLYGON,
		marketSession: currentMarketSession as MarketSession,
		strategyKeys: scanStrategyKeys,
	});
	const screenerConfigs = buildScreenerConfigs();
	return await scanner.executeScan(screenerConfigs);
}

/**
 * Notifies about the scan result.
 */
async function notifyScanResult(currentMarketSession: string, returnedTickerNames: string[]): Promise<void> {
	const sessionLabel = formatSessionLabel(currentMarketSession as MarketSession);
	const notifierService = new NotifierService(new TelegramNotifier());
	const activeTickersStr = returnedTickerNames.join(", ");
	await notifierService.notify(
		`${sessionLabel} scan – Found ${returnedTickerNames.length} active ticker(s): ${activeTickersStr}`
	);
}

/**
 * Generates and sorts mock snapshots for demonstration/testing.
 */
function getSortedSnapshots(
	snapshots: NormalizedRestTickerSnapshot[],
	sortField: keyof NormalizedRestTickerSnapshot
): SortedNormalizedTickerSnapshot[] {
	const rankedSnapshots: SortedNormalizedTickerSnapshot[] = addRankFields(snapshots);
	const rankedSorter = new GenericSorter<SortedNormalizedTickerSnapshot, typeof sortField>(
		sortField,
		SortOrder.DESC,
		"ordinal_sort_position"
	);
	const sortedSnapshots: SortedNormalizedTickerSnapshot[] = rankedSorter.sort(rankedSnapshots);
	return sortedSnapshots;
}

/**
 * Processes the leaderboard with tagged tickers.
 */

async function processLeaderboard(
	snapshotsMap: LeaderboardSnapshotsMap,
	leaderboardTag: string,
	sortField: LeaderboardSortFieldType
): Promise<FileLeaderboardStorage> {
	const storage = new FileLeaderboardStorage();
	await storage.initializeLeaderboardStore(leaderboardTag);
	const sorter = new LeaderboardTickersSorter(sortField, SortOrder.DESC);
	const leaderboardService = new LeaderboardService(storage, scoringStrategies.popUpDecayMomentum);
	await leaderboardService.processNewSnapshots(snapshotsMap, sorter);
	return storage;
}

/**
 * Initializes the EODHD WebSocket client.
 */
function setupWebSocketClient(activeTickersStr: string) {
	const wsClient = new EODHDWebSocketClient(APP_CONFIG.EODHD_API_KEY, activeTickersStr, handleWebSocketTickerUpdate);
	// wsClient.connect();
	return wsClient;
}

/**
 * Main orchestrator function.
 */
export default async function runLiveMarketScannerTask() {
	console.log("🟢 Running markert scanner task at", new Date().toLocaleString());

	try {
		const currentMarketSession = getCurrentMarketSession();
		console.info({ currentMarketSession });

		// Define market scan strategy
		const scanStrategyKeys = [
			"Pre-market top movers",
			// "Recent IPO Top Moving",
		];

		// 1a. Scan
		const returnedSnapshots: NormalizedRestTickerSnapshot[] = await ochestrateMarketScan(
			currentMarketSession,
			scanStrategyKeys
		);
		const returnedTickerNames: string[] = returnedSnapshots.map((snapshot) => snapshot.ticker_name__nz_tick);

		// 1b. Check if any tickers were returned
		if (!returnedTickerNames?.length) {
			console.log("⚠️ No active tickers found from scan.");
			return;
		}

		// 2. Notify
		await notifyScanResult(currentMarketSession, returnedTickerNames);

		// 3. Demo/mock: Generate sorted mock snapshots
		const mockSnapshots = generateMockSnapshots(["AAPL", "TSLA"], 3, {
			changePctRange: [0.1, 0.2],
			trend: "increasing",
		});

		// 4. Sort snapshots
		const sortField: NormalizedSortableFieldType = NORMALIZED_SORT_FIELDS[0];

		// TODO -> Uncomment when real data is available
		// const sortedSnapshots = getSortedSnapshots(returnedSnapshots, sortField);
		const sortedSnapshots = getSortedSnapshots(mockSnapshots, sortField);

		// 5. Transform & tag scan results
		const leaderboardTag = composeScanStrategyTag(scanStrategyKeys);
		const transformer = new LeaderboardTickerTransformer();
		const leaderboardTickers = sortedSnapshots.map((snapshot) => transformer.transform(snapshot));
		const snapshotsMap = tagSnapshotsWithStrategyMeta(leaderboardTickers, leaderboardTag);

		// 6. Process leaderboard
		const storage = await processLeaderboard(snapshotsMap, leaderboardTag, "leaderboard_momentum_score");

		console.log({ leaderboard: storage });

		// 7. WebSocket (optional, currently disabled)
		const activeTickersStr = returnedTickerNames.join(", ");
		setupWebSocketClient(activeTickersStr);
	} catch (error) {
		console.error("❌ Error in runLiveMarketScannerTask:", error);
	}
}
