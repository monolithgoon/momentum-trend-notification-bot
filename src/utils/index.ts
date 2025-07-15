import { APP_CONFIG } from "../config";
import { MarketSessions } from "../core/enums/marketSessions.enum";

export async function safeAPICall<T>(
	fn: () => Promise<T>,
	retries = APP_CONFIG.MAX_NUM_API_RETRIES
): Promise<T | null> {
	try {
		return await fn();
	} catch (err: any) {
		if (retries > 0) {
			await new Promise((r) => setTimeout(r, APP_CONFIG.RETRY_DELAY));
			return await safeAPICall(fn, retries - 1);
		}
		console.error("API call failed after retries:", err.message);
		return null;
	}
}

export function validateWebSocketUrl(url: string): string {
	if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
		throw new Error(`Invalid WebSocket URL: missing ws:// or wss:// prefix → ${url}`);
	}

	// Remove any trailing slash to avoid unexpected 404s
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

// Convert nanosecond timestamp to seconds (Unix time)
export function nsToUnixSec(ns: number): number {
	return Math.floor(ns / 1_000_000_000);
}

// Helper to make label human-friendly
export function formatSessionLabel(session: MarketSessions): string {
	switch (session) {
		case MarketSessions.PRE_MARKET:
			return "Pre-Market";
		case MarketSessions.RTH:
			return "Regular Trading Hours";
		case MarketSessions.AFTER_MARKET:
			return "After-Market";
		default:
			return "Unknown Session";
	}
}

export function getCurrentMarketSession(): MarketSessions {
	const now = new Date();
	const utcHour = now.getUTCHours();
	const utcMinute = now.getUTCMinutes();
	const totalMinutes = utcHour * 60 + utcMinute;

	const MARKET_OPEN_MIN = 13 * 60 + 30; // 13:30 UTC
	const MARKET_CLOSE_MIN = 20 * 60 + 0; // 20:00 UTC

	if (totalMinutes < MARKET_OPEN_MIN) {
		return MarketSessions.PRE_MARKET;
	} else if (totalMinutes >= MARKET_OPEN_MIN && totalMinutes <= MARKET_CLOSE_MIN) {
		return MarketSessions.RTH;
	} else {
		return MarketSessions.AFTER_MARKET;
	}
}

