// src/index.ts
import { APP_CONFIG } from "@config/index";
// Utilities
import { formatSessionLabel, getCurrentMarketSession } from "./utils";
import { WebSocketTickerBuffer } from "./utils/webSocketTickerBuffer";
const wsTickBuffer = new WebSocketTickerBuffer();
// Interfaces
import { EodhdWebSocketTickerSnapshot } from "./services/market_data_providers__deprecated/eodhd/types/websocket.interface";
// Analytics
import { isTrendingAboveKC } from "./analytics/indicators";
// Market Data Providers
import { EODHDWebSocketClient } from "./services/market_data_providers__deprecated/eodhd/eodhdWebSocketClient";
// Services - Notifiers
import { NotifierService } from "./notifiers/NotifierService";
import { TelegramNotifier } from "./notifiers/TelegramNotifier";
// Services - Scanners
// Managers
import { MarketDataVendors } from "./core/enums/marketDataVendors.enum";
import { MarketDataService } from "@services/market_data/marketDataService";

// ---- HANDLE WEBSOCKET TICKER UPDATES ----

function handleWebSocketTickerUpdate(tick: EodhdWebSocketTickerSnapshot) {
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

	const vendor = MarketDataVendors.POLYGON;

	try {
		const currentMarketSession = getCurrentMarketSession();

		const marketDataService = new MarketDataService({ vendor: vendor, marketSession: currentMarketSession });

		const activeTickers_2 = await marketDataService.runService();

		if (!activeTickers_2) return;

		const activeTickersStr = activeTickers_2.join(", ");
		const sessionLabel = formatSessionLabel(currentMarketSession);
		const notifierService = new NotifierService(new TelegramNotifier());

		// WIP
		// await notifierService.notify(
		// 	`${sessionLabel} scan – Found ${activeTickers_2.length} active ticker(s): ${activeTickersStr}`
		// );

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
