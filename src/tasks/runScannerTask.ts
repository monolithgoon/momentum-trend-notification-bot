import { APP_CONFIG } from "../config";
import { TaggedMarketScanTickers } from "@core/types/tagged-market-scan-tickers.interface";
import { MarketQuoteScanner } from "@core/scanners/MarketQuoteScanner";
import { formatSessionLabel, getCurrentMarketSession } from "@utils/index";
import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { NotifierService } from "@services/notifier/NotifierService";
import { TelegramNotifier } from "@services/notifier/TelegramService";
import { generateMockSnapshots } from "@core/scanners/generateMockSnapshots";
import { SortOrder } from "@core/enums/sortOrder.enum";
import { NormalizedRestTickerSnapshot } from "@core/types/NormalizedRestTickerSnapshot.interface";
import { RankedRestTickerSnapshot } from "@core/types/RankedRestTickerSnapshot.interface";
import { GenericRankedItemsFieldSorter } from "@core/ranking/GenericRankedItemsFieldSorter";
import { InMemoryLeaderboardStorage } from "@core/leaderboard/InMemoryLeaderboardStorage";
import { LeaderboardService } from "@core/leaderboard/LeaderboardService";
import { LeaderboardTickersSorter } from "@core/leaderboard/leaderboardTickersSorter";
import { LeaderboardKineticsCalculator } from "@core/leaderboard/LeaderboardKineticsCalculator";
import { EODHDWebSocketClient } from "@services/websocket/EODHDWebSocketClient";
import handleWebSocketTickerUpdate from "@services/websocket/handleWebSocketTickerUpdate";

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

export default async function runScannerTask() {
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

		// Execute scan and get ticker symbols (e.g. ["AAPL", "TSLA"])
		const returnedTickers = ["AAPL", "TSLA"];
		// const returnedTickers: NormalizedRestTickerSnapshot[] = await scanner.executeScan();

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
		const mockSnapshots = generateMockSnapshots(returnedTickers, 3, {
			changePctRange: [0.1, 0.2],
			trend: "increasing",
		});

		// 4. Rank and sort snapshots
		const rankedSnapshots: RankedRestTickerSnapshot[] = addRankFields(mockSnapshots);

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
		console.error("❌ Error in runScannerTask:", error);
	}
}