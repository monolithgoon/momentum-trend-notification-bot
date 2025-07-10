// Represents a single ticker message from EODHD WebSocket
export interface EodhdWebSocketTickerSnapshot {
	s: string; // Symbol, e.g., "AAPL"
	ap: number; // Ask price
	as: number; // Ask size
	bp: number; // Bid price
	bs: number; // Bid size
	t: number; // Timestamp (epoch ms)
}

// Represents the WebSocket message structure for EODHD
export interface EodhdWebSocketMessage {
	action: "auth" | "subscribe" | "ticker";
	status_code?: number; // Optional status for auth response
	status?: string; // Optional status for auth response
	symbols?: string; // Comma-separated symbols for subscription
	tickers?: EodhdWebSocketTickerSnapshot[]; // Array of ticker data
	message?: string; // Error message if status is "error"
}