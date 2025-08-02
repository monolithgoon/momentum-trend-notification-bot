import { APP_CONFIG } from "@config/index";
import eventEmitter from "@infrastructure/event_bus/eventEmitter";
import { MarketScanPayload } from "src/strategies/scan_2/MarketScanPayload.interface";
import { EodhdWebSocketClient } from "@infrastructure/websocket/clients/eodhd/EodhdWebSocketClient";
import handleWebSocketTickerUpdate from "@infrastructure/websocket/handleWebSocketTickerUpdate";
import { WebSocketManager } from "@infrastructure/websocket/WebSocketManager";
import { EVENTS } from "@config/constants";

/**
 * Sets up a listener for "market_scan:complete" to initialize WebSocket updates for tickers.
 */
export function registerWebSocketListener() {
	eventEmitter.on(EVENTS.MARKET_SCAN_COMPLETE, ({ tickerNames }: MarketScanPayload) => {
		if (!tickerNames?.length) return;

		const tickers = tickerNames.join(",");
		const wsClient = new EodhdWebSocketClient(
			APP_CONFIG.EODHD_API_KEY,
			tickers,
			handleWebSocketTickerUpdate
		);
		const wsManager = new WebSocketManager(wsClient);
		wsManager.connect();
	});
}
