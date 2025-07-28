import { APP_CONFIG } from "../config";
import { LeaderboardSnapshotsMap } from "@core/snapshots/rest_api/types/LeaderboardSnapshotsMap";
import { MarketQuoteScanner } from "@core/scanners/MarketQuoteScanner";
import { formatSessionLabel, getCurrentMarketSession } from "../core/utils";
import { MarketDataVendor } from "@core/enums/MarketDataVendor.enum";
import { NotifierService } from "src/services/notifier/NotifierService";
import { TelegramNotifier } from "src/services/notifier/TelegramService";
import { generateMockSnapshots } from "@core/models/rest_api/generateMockSnapshots";
import { SortOrder } from "@core/enums/SortOrder.enum";
import { NormalizedRestTickerSnapshot } from "@core/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { SortedNormalizedTicker } from "@core/snapshots/rest_api/types/SortedNormalizedTicker.interface";
import { GenericSorter } from "@core/generics/GenericSorter";
import { InMemoryLeaderboardStorage } from "@core/analytics/leaderboard/InMemoryLeaderboardStorage";
import { LeaderboardService } from "@core/analytics/leaderboard/LeaderboardService";
import { LeaderboardTickersSorter } from "@analytics/leaderboard/LeaderboardTickersSorter";
import { EODHDWebSocketClient } from "@core/strategies/stream/eodhd/eodhdWebSocketClient";
import handleWebSocketTickerUpdate from "@core/snapshots/websocket/handleWebSocketTickerUpdate";
import { PriceChangeScanFilter, VolumeChangeScanFilter } from "@core/scanners/scanFilters";
import { ScanFilterConfigTypes } from "@core/scanners/types/scanScreenerConfigs.type";
import { FileLeaderboardStorage } from "@analytics/leaderboard/FileLeaderboardStorage";
import { scoringStrategies } from "@analytics/leaderboard/scoringStrategies";

function addTagsToMarketScanResult(
	tickers: NormalizedRestTickerSnapshot[],
	scan_strategy_tag: string = "OK"
): LeaderboardSnapshotsMap {
	return {
		scan_strategy_tag,
		normalized_leaderboard_tickers: tickers.map((ticker) => ({
			...ticker,
		})),
	};
}

function composeScanStrategyTag(scanStrategyKeys: string[]): string {
	return Array.isArray(scanStrategyKeys) ? scanStrategyKeys.join("_") : String(scanStrategyKeys);
}

function addRankFields(snapshots: NormalizedRestTickerSnapshot[]): SortedNormalizedTicker[] {
	return snapshots.map((snapshot, index) => ({
		...snapshot,
		ordinal_sort_position: index,
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
			vendor: MarketDataVendor.POLYGON,
			marketSession: currentMarketSession,
			strategyKeys: scanStrategyKeys,
		});

		const screenerConfigs: ScanFilterConfigTypes[] = [
			{
				scanFilter: new VolumeChangeScanFilter(),
				config: { volumeThreshold: 1_000_000, changePercentageThreshold: 3 },
			},
			{ scanFilter: new PriceChangeScanFilter(), config: { minPriceJump: 2.5 } },
		];

		const returnedSnapshots: NormalizedRestTickerSnapshot[] = await scanner.executeScan(screenerConfigs);
		const returnedTickers: string[] = returnedSnapshots.map(snapshot => snapshot.ticker_name__nz_tick);

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
		const rankedSnapshots: SortedNormalizedTicker[] = addRankFields(mockSnapshots);
		const ordinalSorter = new GenericSorter<SortedNormalizedTicker, "change_pct">(
			"change_pct",
			SortOrder.DESC,
			"ordinal_sort_position"
		);
		const sortedSnapshots: SortedNormalizedTicker[] = ordinalSorter.sort(rankedSnapshots);

		// 5. Tag the scan results for leaderboard
		const leaderboardTag: string = composeScanStrategyTag(scanStrategyKeys);
		const taggedTickers: LeaderboardSnapshotsMap = addTagsToMarketScanResult(
			sortedSnapshots,
			leaderboardTag
		);

		// 6. Leaderboard
		// const storage = new InMemoryLeaderboardStorage();
		const storage = new FileLeaderboardStorage();
		await storage.initializeLeaderboardStore(leaderboardTag);
		const scoringFn = scoringStrategies.popUpDecay;
		// When invoking the leaderboard service sorter, you should always sort by leaderboard_momentum_score (not leaderboard_rank), as rank is assigned after sorting.
		const sorter = new LeaderboardTickersSorter("leaderboard_momentum_score" as const, SortOrder.DESC); 
		const leaderboardService = new LeaderboardService(storage, scoringFn);

		await leaderboardService.processNewSnapshots(taggedTickers, sorter);
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
