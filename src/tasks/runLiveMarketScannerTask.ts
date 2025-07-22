import { APP_CONFIG } from "../config";
import { TaggedNormalizedMarketScanTickers } from "@core/data/snapshots/rest_api/types/tagged-market-scan-tickers.interface";
import { MarketQuoteScanner } from "@core/scanners/MarketQuoteScanner";
import { formatSessionLabel, getCurrentMarketSession } from "../core/utils";
import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { NotifierService } from "src/services/notifier/NotifierService";
import { TelegramNotifier } from "src/services/notifier/TelegramService";
import { generateMockSnapshots } from "@core/data/snapshots/rest_api/generateMockSnapshots";
import { SortOrder } from "@core/enums/sortOrder.enum";
import { NormalizedRestTickerSnapshot } from "@core/data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { RankedRestTickerSnapshot } from "@core/data/snapshots/rest_api/types/RankedRestTickerSnapshot.interface";
import { GenericRankedItemsFieldSorter } from "@core/generics/GenericRankedItemsFieldSorter";
import { InMemoryLeaderboardStorage } from "@core/analytics/leaderboard/InMemoryLeaderboardStorage";
import { LeaderboardService } from "@core/analytics/leaderboard/LeaderboardService";
import { LeaderboardTickersSorter } from "@core/analytics/leaderboard/leaderboardTickersSorter";
import { EODHDWebSocketClient } from "@core/strategies/stream/eodhd/eodhdWebSocketClient";
import handleWebSocketTickerUpdate from "@core/data/snapshots/websocket/handleWebSocketTickerUpdate";
import { PriceChangeScanFilter, VolumeChangeScanFilter } from "@core/scanners/scanFilters";
import { scanScreenerConfigTypes } from "@core/scanners/types/scanScreenerConfigs.type";
import { FileLeaderboardStorage } from "@analytics/leaderboard/FileLeaderboardStorage";
import { scoringStrategies } from "@analytics/leaderboard/scoringStrategies";

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

function composeScanStrategyTag(scanStrategyKeys: string[]): string {
	return Array.isArray(scanStrategyKeys) ? scanStrategyKeys.join("_") : String(scanStrategyKeys);
}

function addRankFields(snapshots: NormalizedRestTickerSnapshot[]): RankedRestTickerSnapshot[] {
	return snapshots.map((snapshot, index) => ({
		...snapshot,
		sort_rank: index,
	}));
}

export default async function runLiveMarketScannerTask() {
	console.log("🟢 Running markert scanner task at", new Date().toLocaleString());

	try {
		const currentMarketSession = getCurrentMarketSession();
		console.info({ currentMarketSession });

		// Define market scan strategy
		const scanStrategyKeys = [
			"Pre-market top movers", // Must match keys in polygnRestApiFetchStrategyRegistry
			// "Recent IPO Top Moving", // Uncomment if needed
		];

		// 1. Scan
		const scanner = new MarketQuoteScanner({
			vendor: MarketDataVendors.POLYGON,
			marketSession: currentMarketSession,
			strategyKeys: scanStrategyKeys,
		});

		const screenerConfigs: scanScreenerConfigTypes[] = [
			{
				scanFilter: new VolumeChangeScanFilter(),
				config: { volumeThreshold: 1_000_000, changePercentageThreshold: 3 },
			},
			{ scanFilter: new PriceChangeScanFilter(), config: { minPriceJump: 2.5 } },
		];

		const returnedTickers = await scanner.executeScan(screenerConfigs);
		// WIP
		// if (!returnedTickers?.length) {
		// 	console.log("No tickers found from scan.");
		// 	return;
		// }

		const activeTickersStr = returnedTickers.join(", ");
		const sessionLabel = formatSessionLabel(currentMarketSession);
		const notifierService = new NotifierService(new TelegramNotifier());

		// Notify about the scan result
		await notifierService.notify(
			`${sessionLabel} scan – Found ${returnedTickers.length} active ticker(s): ${activeTickersStr}`
		);

		// 3. Generate mock snapshots for demonstration/testing
		const mockSnapshots = generateMockSnapshots(["AAPL", "TSLA"], 3, {
			changePctRange: [0.1, 0.2],
			trend: "increasing",
		});

		// 4. Rank & Sort
		const rankedSnapshots: RankedRestTickerSnapshot[] = addRankFields(mockSnapshots);
		const rankedSorter = new GenericRankedItemsFieldSorter<RankedRestTickerSnapshot, "change_pct">(
			"change_pct",
			SortOrder.DESC,
			"sort_rank"
		);
		const sortedSnapshots: RankedRestTickerSnapshot[] = rankedSorter.sort(rankedSnapshots);

		// 5. Tag the scan results for leaderboard
		const leaderboardTag: string = composeScanStrategyTag(scanStrategyKeys);
		const taggedTickers: TaggedNormalizedMarketScanTickers = addTagsToMarketScanResult(
			sortedSnapshots,
			leaderboardTag
		);

		// 6. Leaderboard
		// const storage = new InMemoryLeaderboardStorage();
		const storage = new FileLeaderboardStorage();
		await storage.initializeLeaderboardStore(leaderboardTag);
		const scoringFn = scoringStrategies.popUpDecay;
		const sorter = new LeaderboardTickersSorter("score", SortOrder.DESC);
		const leaderboardService = new LeaderboardService(storage, scoringFn);

		await leaderboardService.processSnapshots(taggedTickers, sorter);
		console.log({ leaderboard: storage });

		// 7. WebSocket
		const wsClient = new EODHDWebSocketClient(
			APP_CONFIG.EODHD_API_KEY,
			activeTickersStr,
			handleWebSocketTickerUpdate
		);
		// wsClient.connect();
	} catch (error) {
		console.error("❌ Error in runLiveMarketScannerTask:", error);
	}
}
