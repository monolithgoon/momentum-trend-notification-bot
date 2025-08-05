import axios from "axios";
import { APP_CONFIG_2 } from "src/config_2/app_config";
import { IRestApiQuoteFetcher } from "src/strategies/fetch_2/types/IRestApiQuoteFetcher.interface";
import { IEnrichedRawFmpQuoteSnapshot } from "@core/models/rest_api/vendors/fmp/IRawFmpQuoteSnapshot.interface";
import { IRawFmpTopGainersSnapshot } from "@core/models/rest_api/vendors/fmp/IRawFmpTopGainersSnapshot.interface";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { nsToUnixSec, safeAPICall } from "@core/utils/index";
import { timestampTradeSessionChk } from "@core/utils/timestampTradeSessionChk";
import { FmpBulkQuoteFetcher } from "./FmpBulkQuoteFetcher";
import { withFmpApiKey } from "src/config_2/constants/fmp.constants";

export class FmpTopGainersFetcher implements IRestApiQuoteFetcher {
	private readonly nowUtc = Math.floor(Date.now() / 1000);
	private readonly bulkQuoteFetcher = new FmpBulkQuoteFetcher();

	public async fetch(session: MarketSession): Promise<IEnrichedRawFmpQuoteSnapshot[]> {
		try {
			const res = await safeAPICall(() =>
				// axios.get(APP_CONFIG_2.fmp.moversUrls.GAINERS, {
				axios.get(withFmpApiKey(APP_CONFIG_2.fmp.moversUrls.GAINERS, `${APP_CONFIG_2.env.FMP_API_KEY}`), {
					// params: { apiKey: APP_CONFIG_2.env.FMP_API_KEY },
				})
			);

			const rawTickers: IRawFmpTopGainersSnapshot[] = res?.data ?? [];

			const tickerSymbols = rawTickers.map((t) => t.symbol);

			// Get additional data for the returned gainers' tickers
			const quoteMap = await this.bulkQuoteFetcher.fetchQuotes(tickerSymbols);

			return rawTickers.map((t): IEnrichedRawFmpQuoteSnapshot => {
				const q = quoteMap[t.symbol] ?? {};
				return {
					symbol: t.symbol,
					name: t.name,
					price: t.price,
					// change: t.priceChangeTodayAbs,
					changesPercentage: t.changesPercentage,
					volume: q.volume,
					marketCap: q.marketCap,
				};
			});
		} catch (err) {
			console.error("❌ Failed to fetch FMP top gainers:", err);
			return [];
		}
	}
}
