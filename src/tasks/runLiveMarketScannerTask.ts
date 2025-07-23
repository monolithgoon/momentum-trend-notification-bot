import { APP_CONFIG } from "../config";
import { formatSessionLabel, getCurrentMarketSession } from "../core/utils";

import { MarketQuoteScanner } from "@core/scanners/MarketQuoteScanner";
import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { PriceChangeScanFilter, VolumeChangeScanFilter } from "@core/scanners/scanFilters";
import { scanScreenerConfigTypes } from "@core/scanners/types/scanScreenerConfigs.type";

import { NotifierService } from "src/services/notifier/NotifierService";
import { TelegramNotifier } from "src/services/notifier/TelegramService";

import { generateMockSnapshots } from "@core/data/snapshots/rest_api/generateMockSnapshots";
import { NormalizedRestTickerSnapshot } from "@core/data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { SortedNormalizedTicker } from "@core/data/snapshots/rest_api/types/SortedNormalizedTicker.interface";

import { GenericSorter } from "@core/generics/GenericSorter";
import { SortOrder } from "@core/enums/sortOrder.enum";

import { FileLeaderboardStorage } from "@analytics/leaderboard/FileLeaderboardStorage";
import { scoringStrategies } from "@analytics/leaderboard/scoringStrategies";
import { LeaderboardService } from "@core/analytics/leaderboard/LeaderboardService";
import { LeaderboardTickersSorter } from "@core/analytics/leaderboard/leaderboardTickersSorter";
import { TaggedNormalizedMarketScanTickers } from "@core/data/snapshots/rest_api/types/tagged-market-scan-tickers.interface";

import { EODHDWebSocketClient } from "@core/strategies/stream/eodhd/eodhdWebSocketClient";
import handleWebSocketTickerUpdate from "@core/data/snapshots/websocket/handleWebSocketTickerUpdate";
import { MarketSessions } from "@core/enums/marketSessions.enum";
// import { InMemoryLeaderboardStorage } from "@core/analytics/leaderboard/InMemoryLeaderboardStorage";

/**
 * Adds a tag to the market scan result.
 */
function addTagsToMarketScanResult(
	tickers: NormalizedRestTickerSnapshot[],
	scan_strategy_tag: string = "OK"
): TaggedNormalizedMarketScanTickers {
	return {
		scan_strategy_tag,
		normalized_tickers: tickers.map((ticker) => ({
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
function addRankFields(snapshots: NormalizedRestTickerSnapshot[]): SortedNormalizedTicker[] {
	return snapshots.map((snapshot, index) => ({
		...snapshot,
		ordinal_sort_position: index,
	}));
}

/**
 * Builds screener configs for the scan.
 */
function buildScreenerConfigs(): scanScreenerConfigTypes[] {
	return [
		{
			scanFilter: new VolumeChangeScanFilter(),
			config: { volumeThreshold: 1_000_000, changePercentageThreshold: 3 },
		},
		{ scanFilter: new PriceChangeScanFilter(), config: { minPriceJump: 2.5 } },
	];
}

/**
 * Executes the market scan and returns the found tickers.
 */
async function scanMarketTickers(currentMarketSession: string, scanStrategyKeys: string[]): Promise<string[]> {
	const scanner = new MarketQuoteScanner({
		vendor: MarketDataVendors.POLYGON,
		marketSession: currentMarketSession as MarketSessions,
		strategyKeys: scanStrategyKeys,
	});
	const screenerConfigs = buildScreenerConfigs();
	const returnedSnapshots: NormalizedRestTickerSnapshot[] = await scanner.executeScan(screenerConfigs);
	const returnedTickers: string[] = returnedSnapshots.map(snapshot => snapshot.n_ticker_name);
	return returnedTickers;
}

/**
 * Notifies about the scan result.
 */
async function notifyScanResult(currentMarketSession: string, returnedTickers: string[]): Promise<void> {
	const sessionLabel = formatSessionLabel(currentMarketSession as MarketSessions);
	const notifierService = new NotifierService(new TelegramNotifier());
	const activeTickersStr = returnedTickers.join(", ");
	await notifierService.notify(
		`${sessionLabel} scan – Found ${returnedTickers.length} active ticker(s): ${activeTickersStr}`
	);
}

/**
 * Generates and sorts mock snapshots for demonstration/testing.
 */
function getSortedMockSnapshots(): SortedNormalizedTicker[] {
	const mockSnapshots = generateMockSnapshots(["AAPL", "TSLA"], 3, {
		changePctRange: [0.1, 0.2],
		trend: "increasing",
	});
	const rankedSnapshots: SortedNormalizedTicker[] = addRankFields(mockSnapshots);
	const rankedSorter = new GenericSorter<SortedNormalizedTicker, "change_pct">(
		"change_pct",
		SortOrder.DESC,
		"ordinal_sort_position"
	);
	const sortedSnapshots: SortedNormalizedTicker[] = rankedSorter.sort(rankedSnapshots);
	return sortedSnapshots;
}

/**
 * Processes the leaderboard with tagged tickers.
 */
async function processLeaderboard(
	taggedTickers: TaggedNormalizedMarketScanTickers,
	leaderboardTag: string
): Promise<FileLeaderboardStorage> {
	const storage = new FileLeaderboardStorage();
	await storage.initializeLeaderboardStore(leaderboardTag);
	const scoringFn = scoringStrategies.popUpDecay;
	const sorter = new LeaderboardTickersSorter("leaderboard_momentum_score", SortOrder.DESC);
	const leaderboardService = new LeaderboardService(storage, scoringFn);
	await leaderboardService.processNewSnapshots(taggedTickers, sorter);
	return storage;
}

/**
 * Initializes the EODHD WebSocket client.
 */
function setupWebSocketClient(activeTickersStr: string) {
	const wsClient = new EODHDWebSocketClient(
		APP_CONFIG.EODHD_API_KEY,
		activeTickersStr,
		handleWebSocketTickerUpdate
	);
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
		const returnedTickers = await scanMarketTickers(currentMarketSession, scanStrategyKeys);

		// 1b. Check if any tickers were returned
		if (!returnedTickers?.length) {
			console.log("⚠️ No active tickers found from scan.");
			return;
		}

		// 2. Notify
		await notifyScanResult(currentMarketSession, returnedTickers);

		// 3. Demo/mock: Generate sorted mock snapshots
		const sortedSnapshots = getSortedMockSnapshots();

		// 4. Tag scan results
		const leaderboardTag = composeScanStrategyTag(scanStrategyKeys);
		const taggedTickers = addTagsToMarketScanResult(sortedSnapshots, leaderboardTag);

		// 5. Process leaderboard
		const storage = await processLeaderboard(taggedTickers, leaderboardTag);
		console.log({ leaderboard: storage });

		// 6. WebSocket (optional, currently disabled)
		const activeTickersStr = returnedTickers.join(", ");
		setupWebSocketClient(activeTickersStr);
	} catch (error) {
		console.error("❌ Error in runLiveMarketScannerTask:", error);
	}
}