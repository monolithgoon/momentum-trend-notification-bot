import { NormalizedRestTickerSnapshot } from "../data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { ScanFilter } from "./types/ScanFilter.interface";

// Configs
export interface VolumePecScanConfig {
	volumeThreshold: number;
	changePercentageThreshold: number;
}

export class VolumeChangeScanFilter implements ScanFilter<VolumePecScanConfig> {
	name = "volumeAndChange";
	description = "Filters tickers based on volume and percentage change";

	runFilter(data: NormalizedRestTickerSnapshot[], config: VolumePecScanConfig): NormalizedRestTickerSnapshot[] {
		return data.filter(
			(ticker) =>
				(ticker.volume ?? 0) >= config.volumeThreshold && ticker.change_pct >= config.changePercentageThreshold
		);
	}
}

export interface PriceSpikeConfig {
	minPriceJump: number;
}

export class PriceSpikeStrategy implements ScanFilter<PriceSpikeConfig> {
	name = "priceSpike";
	description = "Filters tickers based on significant price jumps";

	runFilter(data: NormalizedRestTickerSnapshot[], config: PriceSpikeConfig): NormalizedRestTickerSnapshot[] {
		return data.filter((t) => {
			const high = t.current_day_stats?.h ?? 0;
			const low = t.current_day_stats?.l ?? 0;
			return high - low > config.minPriceJump;
		});
	}
}

export interface PricePercChangConfig {
	pricePercChangeThreshold: number;
}

export class PriceChangeScanFilter implements ScanFilter<PricePercChangConfig> {
	name = "priceChange";
	description = "Filters tickers based on percentage price change";

	runFilter(data: NormalizedRestTickerSnapshot[], config: PricePercChangConfig): NormalizedRestTickerSnapshot[] {
		return data.filter((ticker) => ticker.change_pct >= config.pricePercChangeThreshold);
	}
}

// REMOVE - DEPRECATED
// import { NormalizedRestTickerSnapshot } from "../../snapshots/types/internalTickerSnapshot.interface";

// export interface ScanFilter<TConfig = unknown> {
// 	name: string;
// 	description?: string;
// 	runFilter(data: NormalizedRestTickerSnapshot[], config: TConfig): NormalizedRestTickerSnapshot[];
// }

// export interface VolumePecScanConfig {
// 	volumeThreshold: number;
// 	changePercentageThreshold: number;
// }

// export class VolumeChangeScanFilter implements ScanFilter<VolumePecScanConfig> {
// 	name = "volumeAndChange";
// 	description =  "Filters tickers based on volume and percentage change";

// 	runFilter(data: NormalizedRestTickerSnapshot[], config: VolumePecScanConfig): NormalizedRestTickerSnapshot[] {
// 		return data
// 			.filter(
// 				(ticker) =>
// 					(ticker.volume ?? 0) >= config.volumeThreshold &&
// 					ticker.change_pct >= config.changePercentageThreshold
// 			)
// 			.map((ticker) => ticker.ticker);
// 	}
// }

// export interface PriceSpikeConfig {
// 	minPriceJump: number;
// }

// export class PriceSpikeStrategy implements ScanFilter<PriceSpikeConfig> {
// 	name = "priceSpike";
// 	description = "Filters tickers based on significant price jumps";

// 	runFilter(data: NormalizedRestTickerSnapshot[], config: PriceSpikeConfig): NormalizedRestTickerSnapshot[] {
// 		return data
// 			.filter((t) => {
// 				const high = t.current_day_stats?.h ?? 0;
// 				const low = t.current_day_stats?.l ?? 0;
// 				return high - low > config.minPriceJump;
// 			})
// 			.map((t) => t.ticker);
// 	}
// }

// export interface PricePercChangConfig {
// 	pricePercChangeThreshold: number;
// }

// export class PriceChangeScanFilter implements ScanFilter {
// 	name = "priceChange";

// 	runFilter(data: NormalizedRestTickerSnapshot[], config: PricePercChangConfig): NormalizedRestTickerSnapshot[] {
// 		return data
// 			.filter((ticker) => ticker.change_pct >= config.pricePercChangeThreshold)
// 			.map((ticker) => ticker.ticker);
// 	}
// }
