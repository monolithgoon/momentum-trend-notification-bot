// import { APP_CONFIG } from "@config/index";
import { APP_CONFIG } from "@config/index"
import { EodhdWebSocketMessage, EodhdWebSocketTickerSnapshot } from "@core/models/rest_api/vendors/eodhd/eodhdWebSocketSnapshot.interface";
import { AuthMessage, SubscriptionMessage, WebSocketClientInterface } from "@infrastructure/websocket/types/WebSocketClient.interface";

/**
 * This class is a WebSocket dataFetcher for EODHD, implementing the WebSocketClientInterface.
 *
 * It handles authentication and subscription messages, and processes incoming data.
 * It is designed to work with the EODHD WebSocket API, which provides real-time market data.
 *
 * The dataFetcher can handle both single ticker snapshots and arrays of tickers, processing them accordingly.
 */

export class EodhdWebSocketClient implements WebSocketClientInterface {
	socketClientName = "EODHD";
	socketUrl = APP_CONFIG.EODHD_WEBSOCKET_URL;

	constructor(
		private apiKey: string,
		private symbols: string, // ✅ now it's private & auto-assigned
		private handleTickerData: (ticker: EodhdWebSocketTickerSnapshot) => void
	) {}

	getAuthMessage(): AuthMessage {
		return {
			action: "auth",
			api_token: this.apiKey,
		};
	}

	getSubscriptionMessage(symbols: string): SubscriptionMessage {
		return {
			action: "subscribe",
			symbols,
		};
	}

	/**
	 * Handles incoming WebSocket messages.
	 * This method parses and processes data according to the EODHD API specification.
	 *
	 * @param data Parsed JSON message from the WebSocket.
	 * @param sendToSocket A callback to sendToSocket messages back to the WebSocket server.
	 */
	handleServerMessage(data: any, sendToSocket: (msg: string) => void): void {
		const wsMsg = data as EodhdWebSocketMessage;

		// Handle successful auth response
		if (wsMsg.status_code === 200 || wsMsg.message === "Authorized") {
			const subMsg = JSON.stringify(this.getSubscriptionMessage(this.symbols));
			console.log("✅ Auth OK. Sending subscription:", subMsg);
			sendToSocket(subMsg);
			return;
		}

		// Handle raw ticker snapshot (non-array case)
		if ((data as any).s && (data as any).t) {
			const snapshot = data as EodhdWebSocketTickerSnapshot;
			this.handleTickerData(snapshot);
			return;
		}

		// Handle array of tickers
		if (wsMsg.tickers?.length) {
			for (const ticker of wsMsg.tickers) {
				console.log(`[${this.socketClientName}] Received ticker:`, ticker);
				this.handleTickerData(ticker);
			}
			return;
		}

		// Fallback warning
		console.warn(`[${this.socketClientName}] Unexpected server message:`, wsMsg);
	}
}
