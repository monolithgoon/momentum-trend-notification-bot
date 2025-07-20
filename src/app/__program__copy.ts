// ---- MAIN TASK ----

import { APP_CONFIG } from "../config";
import { TaggedMarketScanTickers } from "@core/types/tagged-market-scan-tickers.interface";
import { MarketQuoteScanner } from "@core/scanners/MarketQuoteScanner";
import { formatSessionLabel, getCurrentMarketSession } from "../utils";
import { MarketDataVendors } from "@core/enums/marketDataVendors.enum";
import { NotifierService } from "@services/notifier/NotifierService";
import { TelegramNotifier } from "@services/notifier/TelegramService";
import { generateMockSnapshots } from "@core/scanners/generateMockSnapshots";
import { RankedTickersSorter } from "@core/scanners/RankedTickersSorter";
import { RedisLeaderboardStorage } from "@core/leaderboard/__unused__RedisLeaderboardStorage";
import { LeaderboardService, LeaderboardSnapshotSorter } from "@core/leaderboard/LeaderboardService";
import { LeaderboardKineticsCalculator } from "@core/leaderboard/LeaderboardKineticsCalculator";
import { EODHDWebSocketClient } from "@services/websocket/EODHDWebSocketClient";
import { InMemoryLeaderboardStorage } from "@core/leaderboard/InMemoryLeaderboardStorage";
import handleWebSocketTickerUpdate from "@services/websocket/handleWebSocketTickerUpdate";
// WIP
import { NormalizedRestTickerSnapshot } from "@core/types/NormalizedRestTickerSnapshot.interface";
import { SortOrder } from "@core/enums/sortOrder.enum";
import { RankedRestTickerSnapshot } from "@core/types/RankedRestTickerSnapshot.interface";
import { GenericRankedItemsFieldSorter } from "@core/ranking/GenericRankedItemsFieldSorter";


function tagMarketScanResult(
	tickers: NormalizedRestTickerSnapshot[],
	scan_strategy_tag: string = "OK"
): TaggedMarketScanTickers[] {
	return [
		{
			scan_strategy_tag,
			tickers,
		},
	];
}

function composeScanStrategyTag(scanStrategyKeys: string[]): string {
	return Array.isArray(scanStrategyKeys) ? scanStrategyKeys.join(" | ") : scanStrategyKeys;
}

export default async function runProgram() {
	console.log("🟢 Running scanner task at", new Date().toLocaleString());

	try {
		const currentMarketSession = getCurrentMarketSession();

		console.log({ currentMarketSession });

		const scanStrategyKeys = [
			"Pre-market top movers", // Must match keys in polygnRestApiFetchStrategyRegistry
			// "Recent IPO Top Moving",     // Optional: if enabled in the registry
		];

		const scanner = new MarketQuoteScanner({
			vendor: MarketDataVendors.POLYGON,
			marketSession: currentMarketSession,
			strategyKeys: scanStrategyKeys,
		});

		const returnedTickers = await scanner.executeScan();

		if (!returnedTickers) return;

		const activeTickersStr = returnedTickers.join(", ");
		const sessionLabel = formatSessionLabel(currentMarketSession);
		const notifierService = new NotifierService(new TelegramNotifier());

		// WIP

		// await notifierService.notify(
		// 	`${sessionLabel} scan – Found ${returnedTickers.length} active ticker(s): ${activeTickersStr}`
		// );

		// WIP - generate mock data

		// 1. Input: ticker symbols
		const returnedTickers_mock = ["AAPL", "MSFT", "TSLA"];

		// 2. Generate 3 snapshots per ticker
		const mockSnapshots = generateMockSnapshots(returnedTickers_mock, 3, {
			changePctRange: [0.1, 0.2], // starting base
			trend: "increasing",
		});

		function addRankFields(snapshots: NormalizedRestTickerSnapshot[]): RankedRestTickerSnapshot[] {
			return snapshots.map((snapshot, index) => ({
				...snapshot,
				sort_rank: index,
			}));
		}

		const rankedSnapshots = addRankFields(mockSnapshots);
		const rankedSorter = new GenericRankedItemsFieldSorter<RankedRestTickerSnapshot, "change_pct">("change_pct", SortOrder.DESC, "sort_rank");
		const sortedSnapshots = rankedSorter.sort(rankedSnapshots);

		// REMOVE - DEPRECATED - replaced with generic
		// const sortedSnapshots = new RankedTickersSorter("change_pct", SortOrder.DESC).sort(mockSnapshots);

		// WIP - tag the scan results

		const taggedTickers: TaggedMarketScanTickers[] = tagMarketScanResult(returnedTickers);
		const leaderboardTag = composeScanStrategyTag(scanStrategyKeys);

		// REMOVE - DEPRECATED
		// WIP - Redis leaderboard storage

		// // 1. Create storage
		// const storage = new RedisLeaderboardStorage(); // your implementation of LeaderboardStorage interface

		// // 2. Create sorter (customize the field & order if needed)
		// const sorter = new LeaderboardSnapshotSorter("score", SortOrder.DESC);

		// // 3. Create kineticsCalculator calculator
		// const kineticsCalculator = new LeaderboardKineticsCalculator();

		// // 4. Inject everything into the service
		// const leaderboard = new LeaderboardService(storage, sorter, kineticsCalculator);

		// // 5. Process all snapshots at once (or in chunks if simulating time)
		// await leaderboard.processSnapshots(sortedSnapshots);

		// WIP - In-memory leaderboard storage

		const storage = new InMemoryLeaderboardStorage();
		const sorter = new LeaderboardSnapshotSorter("score", SortOrder.DESC);
		const kineticsCalculator = new LeaderboardKineticsCalculator();
		const leaderboard = await new LeaderboardService(storage, sorter, kineticsCalculator).processSnapshots(
			sortedSnapshots
		);

		// WIP - Process tagged tickers
		const leaderboardService = new LeaderboardService(storage, leaderboardTag);
		leaderboardService.processSnapshots(taggedTickers, sorter, kineticsCalculator);

		// WIP
		// leaderboard = await leaderboard.getLeaderboard(leaderboardTag);

		console.log({ leaderboard });

		// Init websocket
		const wsClient = new EODHDWebSocketClient(
			APP_CONFIG.EODHD_API_KEY,
			"AAPL, TSLA", // use activeTickersStr if desired
			handleWebSocketTickerUpdate
		);

		// WIP
		// Connect the WS client
		// new WebSocketManager(wsClient).connect();
	} catch (error) {
		console.error("❌ Error in runProgram:", error);
	}
}
