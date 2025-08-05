import { APP_CONFIG } from "@config/index";
import eventEmitter from "@infrastructure/event_bus/eventEmitter";
import { MarketScanPayload } from "src/types/events/MarketScanEventPayload.interface";
import { EodhdWebSocketClient } from "@infrastructure/websocket/clients/eodhd/EodhdWebSocketClient";
import handleWebSocketTickerUpdate from "@infrastructure/websocket/handleWebSocketTickerUpdate";
import { WebSocketManager } from "@infrastructure/websocket/WebSocketManager";
import { appEvents} from "@config/appEvents";
import { APP_CONFIG_2 } from "src/config_2/app_config";

/**
 * Sets up a listener for "market_scan:complete" to initialize WebSocket updates for tickers.
 */

export function registerWebSocketListener() {
	eventEmitter.on(appEvents.MARKET_SCAN_COMPLETE, ({ tickerNames }: MarketScanPayload) => {
		if (!tickerNames?.length) return;

		const tickers = tickerNames.join(",");
		const wsClient = new EodhdWebSocketClient(
			APP_CONFIG_2.eodhd.socketUrl,
			tickers,
			handleWebSocketTickerUpdate
		);
		const wsManager = new WebSocketManager(wsClient);
		// wsManager.connect();
	});
}
