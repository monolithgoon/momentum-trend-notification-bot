import { APP_CONFIG } from "@config/index";
import { MarketSession } from "@core/enums/MarketSession.enum";

/**
 * Checks if a trade timestamp (in seconds) occurred within the specified market session.
 */

export function timestampTradeSessionChk(tradeSec: number, session: MarketSession, nowUtc: number): boolean {
	switch (session) {
		case MarketSession.PRE_MARKET:
			return tradeSec < nowUtc && tradeSec < APP_CONFIG.MARKET_OPEN_UTC;

		case MarketSession.RTH:
			return tradeSec >= APP_CONFIG.MARKET_OPEN_UTC && tradeSec <= APP_CONFIG.MARKET_CLOSE_UTC;

		case MarketSession.AFTER_MARKET:
			return tradeSec > APP_CONFIG.MARKET_CLOSE_UTC && tradeSec < nowUtc;

		default:
			return false;
	}
}
