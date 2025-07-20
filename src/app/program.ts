import { APP_CONFIG } from "../config";
import { TaggedMarketScanTickers } from "@data/snapshots/rest_api/types/tagged-market-scan-tickers.interface";
import { MarketQuoteScanner } from "@scanners/MarketQuoteScanner";
import { formatSessionLabel, getCurrentMarketSession } from "../utils";
import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { NotifierService } from "@services/notifier/NotifierService";
import { TelegramNotifier } from "@services/notifier/TelegramService";
import { generateMockSnapshots } from "@data/snapshots/rest_api/generateMockSnapshots";
import { SortOrder } from "@core/enums/sortOrder.enum";
import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { RankedRestTickerSnapshot } from "@data/snapshots/rest_api/types/RankedRestTickerSnapshot.interface";
import { GenericRankedItemsFieldSorter } from "@core/generics/genericRankedItemsFieldSorter";
import { InMemoryLeaderboardStorage } from "@analytics/leaderboard/InMemoryLeaderboardStorage";
import { LeaderboardService } from "@analytics/leaderboard/LeaderboardService";
import { LeaderboardTickersSorter } from "@analytics/leaderboard/leaderboardTickersSorter";
import { LeaderboardKineticsCalculator } from "@analytics/leaderboard/LeaderboardKineticsCalculator";
import { EODHDWebSocketClient } from "@strategies/stream/eodhd/eodhdWebSocketClient";
import handleWebSocketTickerUpdate from "@data/snapshots/websocket/handleWebSocketTickerUpdate";
import { PriceChangeScanFilter, VolumeChangeScanFilter } from "@scanners/scanFilters";
import { screenerConfigTypes } from "@scanners/types/screenerConfigs.type";

function addTagsToMarketScanResult(
	tickers: NormalizedRestTickerSnapshot[],
	scan_strategy_tag: string = "OK"
): TaggedMarketScanTickers {
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


export default async function runProgram() {
	console.log("🟢 Running scanner task at", new Date().toLocaleString());

	try {
		const currentMarketSession = getCurrentMarketSession();
		console.log({ currentMarketSession });

		const scanStrategyKeys = [
			"Pre-market top movers", // Must match keys in polygnRestApiFetchStrategyRegistry
			// "Recent IPO Top Moving", // Uncomment if needed
		];

		// 1. SCAN for tickers
		const scanner = new MarketQuoteScanner({
			vendor: MarketDataVendors.POLYGON,
			marketSession: currentMarketSession,
			strategyKeys: scanStrategyKeys,
		});

		const screenerConfigs: screenerConfigTypes[] = [
			{
				scanFilter: new VolumeChangeScanFilter(),
				config: { volumeThreshold: 1_000_000, changePercentageThreshold: 3 },
			},
			{
				scanFilter: new PriceChangeScanFilter(),
				config: { minPriceJump: 2.5 },
			},
		];


		// Execute scan and get ticker symbols
		const returnedTickers: NormalizedRestTickerSnapshot[] = await scanner.executeScan(screenerConfigs);

		if (!returnedTickers || returnedTickers.length === 0) {
			console.log("No tickers found from scan.");
			return;
		}

		const activeTickersStr = returnedTickers.join(", ");
		const sessionLabel = formatSessionLabel(currentMarketSession);
		const notifierService = new NotifierService(new TelegramNotifier());

		// 2. Notify about the scan result
		await notifierService.notify(
			`${sessionLabel} scan – Found ${returnedTickers.length} active ticker(s): ${activeTickersStr}`
		);

		// 3. Generate mock snapshots for demonstration/testing
		// (Replace with your actual snapshot acquisition logic in prod)
		const mockSnapshots = generateMockSnapshots(["AAPL", "TSLA"], 3, {
			changePctRange: [0.1, 0.2],
			trend: "increasing",
		});

		// WIP
		// 4. Rank and sort snapshots
		const rankedSnapshots: RankedRestTickerSnapshot[] = addRankFields(mockSnapshots);
		// const rankedSnapshots: RankedRestTickerSnapshot[] = addRankFields(returnedTickers);

		// Use generic sorter (by change_pct, highest first, then by sort_rank)
		const rankedSorter = new GenericRankedItemsFieldSorter<RankedRestTickerSnapshot, "change_pct">(
			"change_pct",
			SortOrder.DESC,
			"sort_rank"
		);

		const sortedSnapshots: RankedRestTickerSnapshot[] = rankedSorter.sort(rankedSnapshots);

		// 5. Tag the scan results for leaderboard
		const leaderboardTag: string = composeScanStrategyTag(scanStrategyKeys);
		const taggedTickers: TaggedMarketScanTickers = addTagsToMarketScanResult(sortedSnapshots, leaderboardTag);

		// 6. Leaderboard: In-memory storage, sort by 'score', compute kinetics
		const storage = new InMemoryLeaderboardStorage();
		const sorter = new LeaderboardTickersSorter("score", SortOrder.DESC);
		const kineticsCalculator = new LeaderboardKineticsCalculator();
		const leaderboardService = new LeaderboardService(storage);

		// Optionally, process tagged tickers for a session leaderboard
		await leaderboardService.processSnapshots(taggedTickers, sorter, kineticsCalculator);

		// Optionally, fetch the current leaderboard (if you have such a method)
		// const leaderboard = await leaderboardService.getLeaderboard(leaderboardTag);

		// Show leaderboard object (may need to adapt based on your LeaderboardService implementation)
		console.log({ leaderboard: storage });

		// 7. Init WebSocket for live ticker updates
		const wsClient = new EODHDWebSocketClient(
			APP_CONFIG.EODHD_API_KEY,
			activeTickersStr,
			handleWebSocketTickerUpdate
		);
		// If you have a WebSocketManager, connect here. Otherwise, connect directly:
		// wsClient.connect();
	} catch (error) {
		console.error("❌ Error in runProgram:", error);
	}
}
