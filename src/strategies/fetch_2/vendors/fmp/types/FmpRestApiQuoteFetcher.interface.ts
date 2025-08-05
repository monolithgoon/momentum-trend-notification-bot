import { FmpSingleQuoteFetcher } from "../fetchers/FmpSingleQuoteFetcher";
import { FmpBulkQuoteFetcher } from "../fetchers/FmpBulkQuoteFetcher";
import { IRestApiQuoteFlexFetcher } from "src/strategies/fetch_2/types/IRestApiQuoteFetcher.interface";

export class FmpRestApiQuoteFlexFetcher implements IRestApiQuoteFlexFetcher {
	private readonly singleFetcher = new FmpSingleQuoteFetcher();
	private readonly bulkFetcher = new FmpBulkQuoteFetcher();

	public async fetchQuote(symbol: string): Promise<Record<string, any>> {
		return await this.singleFetcher.fetchQuote(symbol);
	}

	public async fetchQuotes(symbols: string[]): Promise<Record<string, any>> {
		return await this.bulkFetcher.fetchQuotes(symbols);
	}
}
