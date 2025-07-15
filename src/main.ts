// main.ts
import { createScannerApp } from "./app";
import { getCurrentMarketSession, formatSessionLabel } from "./utils";
import { TelegramNotifier } from "./notifiers/TelegramNotifier";
import { NotifierService } from "./notifiers/NotifierService";
import { EODHDWebSocketClient } from "./services/market_data_providers__deprecated/eodhd/eodhdWebSocketClient";
import { WebSocketManager } from "./infrastructure/websocket/websocketManager";
import { EodhdWebSocketTickerSnapshot } from "./services/market_data_providers__deprecated/eodhd/types/websocket.interface";
import { APP_CONFIG } from "./config";

function handleTickerUpdate(data: EodhdWebSocketTickerSnapshot) {
	console.log("🔄 Ticker update:", data);
}

async function runScanAndNotify() {
	const { scanner, config } = createScannerApp();

	const session = getCurrentMarketSession();
	const activeTickers = await scanner.runScan(session);
	const activeTickersStr = activeTickers.join(", ");
	const sessionLabel = formatSessionLabel(session);

	const notifierService = new NotifierService(new TelegramNotifier());

	await notifierService.notify(`${sessionLabel} scan – Found ${activeTickers.length} ticker(s): ${activeTickersStr}`);

	// Init websocket client
	const wsClient = new EODHDWebSocketClient(
		APP_CONFIG.EODHD_API_KEY,
		"AAPL, TSLA", // use activeTickersStr if desired
		handleTickerUpdate
	);

	new WebSocketManager(wsClient).connect();
}

function startDaemon(intervalMs: number = APP_CONFIG.SCAN_DAEMON_INTERVAL_MS) {
	let isRunning = false;

	const loop = async () => {
		if (isRunning) return console.log("Scan still running, skipping cycle");
		isRunning = true;
		await runScanAndNotify();
		isRunning = false;
	};

	loop(); // run immediately
	setInterval(loop, intervalMs);
}

startDaemon(APP_CONFIG.SCAN_DAEMON_INTERVAL_MS);
