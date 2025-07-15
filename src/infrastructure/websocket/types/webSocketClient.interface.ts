export interface AuthMessage {
	action: "auth";
	api_token: string;
}

export interface SubscriptionMessage {
	action: "subscribe";
	symbols: string;
}

export interface WebSocketClientInterface {
	socketClientName: string;
	socketUrl: string;

	/**
	 * Returns the authentication message required by the vendor.
	 */
	getAuthMessage(): AuthMessage;
	/**
	 * Returns the subscription message, given an array of symbols.
	 * @param symbols List of symbols to subscribe to (e.g., ["AAPL.US", "GOOG.US"])
	 */
	getSubscriptionMessage(symbols: string): SubscriptionMessage;
/**
	 * Handles an incoming parsed WebSocket message and optionally sends a response.
	 * 
	 * @param data Parsed JSON message from the WebSocket server
	 * @param send A callback to send messages back over the WebSocket
	 */
	handleServerMessage(data: any, send: (msg: string) => void): void;
}
