import { MarketSessions } from "../enums/marketSessions.enum";

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