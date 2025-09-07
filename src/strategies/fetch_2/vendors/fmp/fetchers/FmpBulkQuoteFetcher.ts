import axios from "axios";
import { safeAPICall } from "@core/utils/index";
import { APP_CONFIG_2 } from "src/config_2/app_config";
import { withFmpApiKey } from "src/config_2/constants/fmp.constants";

export class FmpBulkQuoteFetcher {
	public async fetchQuotes(symbols: string[]): Promise<Record<string, any>> {
		if (symbols.length === 0) return {};

		const joined = symbols.join(",");
		const quoteMap: Record<string, any> = {};

		try {
			const res = await safeAPICall(() =>
				// axios.get(`https://financialmodelingprep.com/api/v3/quote/${joined}`, {
				axios.get(withFmpApiKey(APP_CONFIG_2.fmp.batchQuoteUrl(joined), `${APP_CONFIG_2.env.FMP_API_KEY}`), {
					// params: { apikey: APP_CONFIG_2.env.FMP_API_KEY },
				})
			);

			for (const q of res?.data ?? []) {
				if (q?.symbol) quoteMap[q.symbol] = q;
			}

			return quoteMap;
		} catch (err) {
			console.error("❌ Failed to fetch bulk FMP quotes:", err);
			return {};
		}
	}
}
