import { MarketSessions } from "../enums/marketSessions.enum";

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