// /src/vendors/eodhdVendor.ts

import axios from "axios";
import { APP_CONFIG } from "../../../config";
import { safeAPICall } from "../../../utils";
import { MarketSessionDataProvider } from "../types/sessionDataProvider.interface";
import { EodhdTickerSnapshot } from "./types/ticker.interface";

/**
 * EODHD vendor implementation for fetching pre-market active tickers.
 * Note: Replace the mock URL with the actual EODHD endpoint for bulk tickers.
 */
export class EODHDMarketDataClient implements MarketSessionDataProvider {
	async fetchPreMarketMovers(): Promise<string[]> {
		const url = `${APP_CONFIG.EODHD_LIVE_US_QUOTE_URL}/AAPL.US?api_token=${APP_CONFIG.EODHD_API_KEY}&fmt=json`;
		const response = await safeAPICall(() => axios.get<EodhdTickerSnapshot>(url));
		const data = response?.data;

		console.log(response?.data);

		if (!data) return [];

		const passesVolumeChk = data.volume > APP_CONFIG.PRE_MARKET_MIN_VOLUME;
		const passesChangeChk = data.change_p * 100 > APP_CONFIG.PRE_MARKET_MIN_CHANGE_PERC;

		return passesVolumeChk && passesChangeChk ? [data.code] : [];
	}

	// TODO -> Stub for now:
	async getRTHData(): Promise<any[]> {
		return [];
	}

	// TODO -> Stub for now:
	async getAfterMarketData(): Promise<any[]> {
		return [];
	}
}
