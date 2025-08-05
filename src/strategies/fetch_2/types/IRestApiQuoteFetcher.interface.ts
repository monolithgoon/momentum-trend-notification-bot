import { MarketSession } from "@core/enums/MarketSession.enum";

// WIP
export interface IRestApiQuoteFetcher {
	/**
	 * Base interface from which all vendor market data fetchers extend..
	 */
	fetch(session: MarketSession): Promise<Record<string, any>>;
}

export interface IRestApiQuoteFlexFetcher {
	/**
	 * Fetch quote data for a single ticker symbol.
	 */
	fetchQuote(symbol: string, marketSession: MarketSession): Promise<Record<string, any>>;

	/**
	 * Fetch quotes for multiple ticker symbols (batch).
	 */
	fetchQuotes(symbols: string[], marketSession: MarketSession): Promise<Record<string, any>>;
}