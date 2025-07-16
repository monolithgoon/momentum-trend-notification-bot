// src/index.ts
import { APP_CONFIG } from "@config/index";
// Utilities
import { formatSessionLabel, getCurrentMarketSession } from "./utils";
import { WebSocketTickerBuffer } from "./utils/webSocketTickerBuffer";
const wsTickBuffer = new WebSocketTickerBuffer();
// Interfaces
import { EodhdWebSocketTickerSnapshot } from "./data/snapshots/vendors/eodhd/eodhdWebSocketSnapshot.interface";
// Analytics
import { isTrendingAboveKC } from "./analytics/indicators";
// Market Data Providers
import { EODHDWebSocketClient } from "./strategies/stream/eodhd/eodhdWebSocketClient";
// Services - Notifiers
import { NotifierService } from "./services/NotifierService";
import { TelegramNotifier } from "./services/TelegramService";
// Services - Scanners
// Managers
import { MarketDataVendors } from "./core/enums/marketDataVendors.enum";
import { MarketSessions } from "@core/enums/marketSessions.enum";
import { MarketSnapshotScanner } from "@strategies/scan/MarketSnapshotScanner";
import { WebSocketManager } from "@infrastructure/websocket/websocketManager";
import { waitForInternet } from "./net/waitForInternet";

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

	// MarketDataQuoteService vs MarketDataWebsocketService

	try {
		const currentMarketSession = getCurrentMarketSession();

		const marketSnapshotScanner = new MarketSnapshotScanner({
			vendor: MarketDataVendors.POLYGON,
			marketSession: MarketSessions.PRE_MARKET,
			strategyKeys: [
				"Pre-market top movers", // Must match keys in polygonFetchStrategyRegistry
				// "Recent IPO Top Moving",     // Optional: if enabled in the registry
			],
		});

		const activeTickers = await marketSnapshotScanner.runService();

		if (!activeTickers) return;

		const activeTickersStr = activeTickers.join(", ");
		const sessionLabel = formatSessionLabel(currentMarketSession);
		const notifierService = new NotifierService(new TelegramNotifier());

		// WIP
		// await notifierService.notify(
		// 	`${sessionLabel} scan – Found ${activeTickers.length} active ticker(s): ${activeTickersStr}`
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

function startAppDaemon(intervalMs: number = 5 * 60 * 1000) {
	let isRunning = false;

	async function safeRun() {
		if (isRunning) {
			console.log("⏳ Previous scan still running. Skipping this cycle.");
			return;
		}

		try {
			await waitForInternet(); // Will block here if disconnected
			isRunning = true;
			await runProgram();
		} catch (err) {
			console.error("Daemon error:", err);
		} finally {
			isRunning = false;
		}
	}

	console.log(`📡 Scanner daemon started. Interval: ${intervalMs / 1000} seconds`);
	safeRun();
	setInterval(safeRun, intervalMs);
}

// ---- START ----

startAppDaemon(APP_CONFIG.SCAN_DAEMON_INTERVAL_MS); // Every 1 minute

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

- Maintain an internal leaderboard, and have an anomaly detection algorithm for new tickers that appear on the leaderboard

WS
- Monitor anomalies to check if they're trending above KC
 */
