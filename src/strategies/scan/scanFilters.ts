import { InternalTickerSnapshot } from "../../core/interfaces/internalTickerSnapshot.interface";

import { ScanFilter } from "./types/scanFilter.interface";

// Configs
export interface VolumePecScanConfig {
	volumeThreshold: number;
	changePercentageThreshold: number;
}

export class VolumeChangeScanFilter implements ScanFilter<VolumePecScanConfig> {
	name = "volumeAndChange";
	description = "Filters tickers based on volume and percentage change";

	runFilter(data: InternalTickerSnapshot[], config: VolumePecScanConfig): InternalTickerSnapshot[] {
		return data.filter(
			(ticker) =>
				(ticker.volume ?? 0) >= config.volumeThreshold && ticker.changePct >= config.changePercentageThreshold
		);
	}
}

export interface PriceSpikeConfig {
	minPriceJump: number;
}

export class PriceSpikeStrategy implements ScanFilter<PriceSpikeConfig> {
	name = "priceSpike";
	description = "Filters tickers based on significant price jumps";

	runFilter(data: InternalTickerSnapshot[], config: PriceSpikeConfig): InternalTickerSnapshot[] {
		return data.filter((t) => {
			const high = t.currentDayStats?.h ?? 0;
			const low = t.currentDayStats?.l ?? 0;
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

	runFilter(data: InternalTickerSnapshot[], config: PricePercChangConfig): InternalTickerSnapshot[] {
		return data.filter((ticker) => ticker.changePct >= config.pricePercChangeThreshold);
	}
}

// REMOVE - DEPRECATED
// import { InternalTickerSnapshot } from "../../snapshots/types/internalTickerSnapshot.interface";

// export interface ScanFilter<TConfig = unknown> {
// 	name: string;
// 	description?: string;
// 	runFilter(data: InternalTickerSnapshot[], config: TConfig): InternalTickerSnapshot[];
// }

// export interface VolumePecScanConfig {
// 	volumeThreshold: number;
// 	changePercentageThreshold: number;
// }

// export class VolumeChangeScanFilter implements ScanFilter<VolumePecScanConfig> {
// 	name = "volumeAndChange";
// 	description =  "Filters tickers based on volume and percentage change";

// 	runFilter(data: InternalTickerSnapshot[], config: VolumePecScanConfig): InternalTickerSnapshot[] {
// 		return data
// 			.filter(
// 				(ticker) =>
// 					(ticker.volume ?? 0) >= config.volumeThreshold &&
// 					ticker.changePct >= config.changePercentageThreshold
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

// 	runFilter(data: InternalTickerSnapshot[], config: PriceSpikeConfig): InternalTickerSnapshot[] {
// 		return data
// 			.filter((t) => {
// 				const high = t.currentDayStats?.h ?? 0;
// 				const low = t.currentDayStats?.l ?? 0;
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

// 	runFilter(data: InternalTickerSnapshot[], config: PricePercChangConfig): InternalTickerSnapshot[] {
// 		return data
// 			.filter((ticker) => ticker.changePct >= config.pricePercChangeThreshold)
// 			.map((ticker) => ticker.ticker);
// 	}
// }
