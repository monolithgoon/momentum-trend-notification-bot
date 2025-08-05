import axios from "axios";
import { safeAPICall } from "@core/utils/index";
import { APP_CONFIG_2 } from "src/config_2/app_config";

export class FmpBulkQuoteFetcher {
	public async fetchQuotes(symbols: string[]): Promise<Record<string, any>> {
		if (symbols.length === 0) return {};

		const joined = symbols.join(",");

		try {
			const res = await safeAPICall(() =>
				axios.get(`https://financialmodelingprep.com/api/v3/quote/${joined}`, {
					params: { apikey: APP_CONFIG_2.env.FMP_API_KEY },
				})
			);

			const quoteMap: Record<string, any> = {};
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
