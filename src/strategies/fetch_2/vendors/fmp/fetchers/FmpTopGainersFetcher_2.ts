import axios from "axios";
import { APP_CONFIG_2 } from "src/config_2/app_config";
import { IRestApiQuoteFetcher } from "src/strategies/fetch_2/types/IRestApiQuoteFetcher.interface";
import { IEnrichedRawFmpQuoteSnapshot } from "@core/models/rest_api/vendors/fmp/IRawFmpQuoteSnapshot.interface";
import { IRawFmpTopGainersSnapshot } from "@core/models/rest_api/vendors/fmp/IRawFmpTopGainersSnapshot.interface";
import { MarketSession } from "@core/enums/MarketSession.enum";
import { safeAPICall } from "@core/utils/index";
import { FmpBulkQuoteFetcher } from "./FmpBulkQuoteFetcher";
import { withFmpApiKey } from "src/config_2/constants/fmp.constants";

// export class FmpTopGainersFetcher implements IRestApiQuoteFetcher {
// 	private readonly nowUtc = Math.floor(Date.now() / 1000);
// 	private readonly bulkQuoteFetcher = new FmpBulkQuoteFetcher();

// 	public async fetch(session: MarketSession): Promise<IEnrichedRawFmpQuoteSnapshot[]> {
// 		try {
// 			const res = await safeAPICall(() =>
// 				// axios.get(APP_CONFIG_2.fmp.moversUrls.GAINERS, {
// 				axios.get(withFmpApiKey(APP_CONFIG_2.fmp.moversUrls.GAINERS, `${APP_CONFIG_2.env.FMP_API_KEY}`), {
// 					// params: { apiKey: APP_CONFIG_2.env.FMP_API_KEY },
// 				})
// 			);

// 			const rawTickers: IRawFmpTopGainersSnapshot[] = res?.data ?? [];

// 			console.log({gainers: rawTickers.slice(0,2)})

// 			const tickerSymbols = rawTickers.map((t) => t.symbol);

// 			// Get additional data for the returned gainers' tickers
// 			const quoteMap = await this.bulkQuoteFetcher.fetchQuotes(tickerSymbols);

// 			return rawTickers.map((t): IEnrichedRawFmpQuoteSnapshot => {
// 				const q = quoteMap[t.symbol] ?? {};
// 				return {
// 					symbol: t.symbol,
// 					name: t.name,
// 					price: t.price,
// 					// change: t.priceChangeTodayAbs,
// 					changesPercentage: t.changesPercentage,
// 					volume: q.volume,
// 					marketCap: q.marketCap,
// 				};
// 			});
// 		} catch (err) {
// 			console.error("❌ Failed to fetch FMP top gainers:", err);
// 			return [];
// 		}
// 	}
// }

import { FmpSingleQuoteFetcher_2 } from "./FmpSingleQuoteFetcher";
import { adaptRawFmpQuote, IFmpQuoteRaw } from "./adaptRawFmpQuote";

export class FmpTopGainersFetcher {
  private readonly bulkQuoteFetcher = new FmpBulkQuoteFetcher();
  private readonly singleQuoteFetcher = new FmpSingleQuoteFetcher_2();

  public async fetch(session: MarketSession): Promise<IFmpQuoteRaw[]> {
    try {
      const res = await safeAPICall(() =>
        axios.get(
          withFmpApiKey(
            APP_CONFIG_2.fmp.moversUrls.GAINERS,
            `${APP_CONFIG_2.env.FMP_API_KEY}`
          )
        )
      );

      const rawTickers: any[] = res?.data ?? [];
      const symbols = rawTickers.map((t) => t.symbol);

      // bulk first
      let quoteMap = await this.bulkQuoteFetcher.fetchQuotes(symbols);

      // fallback if bulk failed
      if (Object.keys(quoteMap).length === 0 && symbols.length > 0) {
        console.warn("⚠️ Bulk fetch failed — falling back to singles");
        const fallback: Record<string, IFmpQuoteRaw> = {};
        for (const sym of symbols) {
          const q = await this.singleQuoteFetcher.fetchQuote(sym);
          if (q) fallback[sym] = q;
        }
        quoteMap = fallback;
      }

      return rawTickers.map((t) =>
        adaptRawFmpQuote({ ...t, ...quoteMap[t.symbol] })
      );
    } catch (err) {
      console.error("❌ Failed to fetch FMP top gainers:", err);
      return [];
    }
  }
}
