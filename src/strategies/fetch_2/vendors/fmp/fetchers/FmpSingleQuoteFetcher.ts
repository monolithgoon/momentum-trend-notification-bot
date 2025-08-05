import axios from "axios";
import { safeAPICall } from "@core/utils/index";
import { APP_CONFIG_2 } from "src/config_2/app_config";

export interface FmpQuote {
	symbol: string;
	name?: string;
	price?: number;
	volume?: number;
	marketCap?: number;
	pe?: number;
	exchange?: string;
	// Add more fields as needed
}

export class FmpSingleQuoteFetcher {
	public async fetchQuote(symbol: string): Promise<Partial<FmpQuote>> {
		if (!symbol) {
			throw new Error("❌ fetchQuote() requires a non-empty symbol");
		}

		try {
			const res = await safeAPICall(() =>
				axios.get(`https://financialmodelingprep.com/api/v3/quote/${symbol}`, {
					params: { apikey: APP_CONFIG_2.env.FMP_API_KEY },
				})
			);

			const data = res?.data?.[0];
			if (!data) {
				console.warn(`⚠️ No quote found for symbol: ${symbol}`);
				return {};
			}

			return {
				symbol: data.symbol,
				name: data.name,
				price: data.price,
				volume: data.volume,
				marketCap: data.marketCap,
				pe: data.pe,
				exchange: data.exchange,
			};
		} catch (err) {
			console.error(`❌ Failed to fetch FMP quote for ${symbol}:`, err);
			return {};
		}
	}
}
