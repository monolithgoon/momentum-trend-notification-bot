// src/index.ts
import { APP_CONFIG } from "./config";
// Utilities
import { formatSessionLabel, getCurrentMarketSession } from "./utils";
import { WebSocketTickerBuffer } from "./utils/webSocketTickerBuffer";
const wsTickBuffer = new WebSocketTickerBuffer();
// Interfaces
import { EodhdWebSocketTickerSnapshot } from "./market_data_providers/eodhd/interfaces/websocket.interface";
// Analytics
import { isTrendingAboveKC } from "./analytics/indicators";
// Market Data Providers
import { EODHDWebSocketClient } from "./market_data_providers/eodhd/eodhdWebSocketClient";
import { PolygonMarketFetcher } from "./market_data_providers/polygon/polygonDataFetcher";
// Services - Notifiers
import { NotifierService } from "./services/notifiers/NotifierService";
import { TelegramNotifier } from "./services/notifiers/TelegramNotifier";
// Services - Scanners
import { MarketSessionScanner } from "./services/scanners/marketSessionScanner";
import { VolumeChangeScanStrategy, PriceChangeScanStrategy } from "./services/scanners/scanStrategies";
// Managers
import { WebSocketManager } from "./managers/websocketManager";

// ---- HANDLE TICKER UPDATES ----

function handleTickerUpdate(tick: EodhdWebSocketTickerSnapshot) {
	wsTickBuffer.addTick(tick);

	const buffer = wsTickBuffer.getBuffer(tick.s);

	const symbolBufferLength = wsTickBuffer.getBufferLength(tick.s);
	console.log({ symbolBufferLength });

	isTrendingAboveKC(buffer).then(async (trending) => {
		if (trending) {
			const notifierService = new NotifierService(new TelegramNotifier());
			await notifierService.notify(`🚀 ${tick.s} is trending above the KC!`);
		}
	});
}

// ---- MAIN TASK ----

async function runProgram() {
	console.log("🟢 Running scanner task at", new Date().toLocaleString());

	const fetcher = new PolygonMarketFetcher();

	const scanner = new MarketSessionScanner(fetcher, [
		{
			strategy: new VolumeChangeScanStrategy(),
			config: { volumeThreshold: 1_000_000, changePercentageThreshold: 3 },
		},
		{
			strategy: new PriceChangeScanStrategy(),
			config: { minPriceJump: 2.5 },
		},
	]);

	try {
		const session = getCurrentMarketSession();
		const activeTickers = await scanner.runScan(session);

		if (!activeTickers) return;

		const activeTickersStr = activeTickers.join(", ");
		const sessionLabel = formatSessionLabel(session);
		const notifierService = new NotifierService(new TelegramNotifier());

		// WIP
		// await notifierService.notify(
		// 	`${sessionLabel} scan – Found ${activeTickers.length} active ticker(s): ${activeTickersStr}`
		// );

		// Init websocket
		const wsClient = new EODHDWebSocketClient(
			APP_CONFIG.EODHD_API_KEY,
			"AAPL, TSLA", // use activeTickersStr if desired
			handleTickerUpdate
		);

		// WIP
		// Connect the WS client
		// new WebSocketManager(wsClient).connect();
	} catch (error) {
		console.error("❌ Error in runProgram:", error);
	}
}

// ---- DAEMON SERVICE SCHEDULER ----

function startScannerDaemon(intervalMs: number = 5 * 60 * 1000) {
	let isRunning = false;

	console.log(`📡 Scanner daemon started. Interval: ${intervalMs / 1000} seconds`);

	const safeRun = async () => {
		if (isRunning) {
			console.log("⏳ Previous scan still running. Skipping this cycle.");
			return;
		}

		isRunning = true;
		try {
			await runProgram();
		} catch (err) {
			console.error("Daemon error:", err);
		} finally {
			isRunning = false;
		}
	};

	// Run immediately, then schedule
	safeRun();
	setInterval(safeRun, intervalMs);
}

// ---- START ----

startScannerDaemon(APP_CONFIG.SCAN_DAEMON_INTERVAL_MS); // Every 1 minute

function climbStairs(n: number): number {
	const memo: Record<number, number> = {};

	function dp(step: number) {
		// base cases
		if (step == 0) return 1; // 1 way to stay on the ground
		if (step == 1) return 1; // 1 way to reach the first step
		if (step < 0) return 0; // No way to reach negative steps

		// Check if already computed
		if (memo[step] !== undefined) return memo[step];

		// Compute and memoize
		memo[step] = dp(step - 1) + dp(step - 2);
		return memo[step];
	}

	return dp(n);
}

/**
 * Market Movers Scan
- Compare snapshots to detect tickers moving up, or just added and rising

WS
- Monitor anomalies to check if they're trending above KC
 */
