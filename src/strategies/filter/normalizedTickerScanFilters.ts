import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";

interface NormalizedTickerScanFilter<TConfig = unknown> {
	name: string;
	description?: string;
	runFilter(data: NormalizedRestTickerSnapshot[], config: TConfig): NormalizedRestTickerSnapshot[];
}

// --- Config Interfaces ---

export interface VolumePctChangeConfig {
	volumeThreshold: number;
	changePercentageThreshold: number;
}

export interface PriceSpikeConfig {
	minPriceJump: number;
}

export interface PricePercChangConfig {
	pricePercChangeThreshold: number;
}

// --- Scan Filter Implementations ---

export class VolumeChangeScanFilter implements NormalizedTickerScanFilter<VolumePctChangeConfig> {
	name = "volumeAndChange";
	description = "Filters tickers based on volume and percentage change";

	runFilter(data: NormalizedRestTickerSnapshot[], config: VolumePctChangeConfig): NormalizedRestTickerSnapshot[] {
		return data.filter(
			(ticker) =>
				(ticker.volume ?? 0) >= config.volumeThreshold &&
				ticker.change_pct__nz_tick >= config.changePercentageThreshold
		);
	}
}

export class PriceSpikeStrategy implements NormalizedTickerScanFilter<PriceSpikeConfig> {
	name = "priceSpike";
	description = "Filters tickers based on significant price jumps";

	runFilter(data: NormalizedRestTickerSnapshot[], config: PriceSpikeConfig): NormalizedRestTickerSnapshot[] {
		return data.filter((t) => {
			const high = t.current_day_stats_low ?? 0;
			const low = t.current_day_stats_low ?? 0;
			return high - low > config.minPriceJump;
		});
	}
}

export class PriceChangeScanFilter implements NormalizedTickerScanFilter<PricePercChangConfig> {
	name = "priceChange";
	description = "Filters tickers based on percentage price change";

	runFilter(data: NormalizedRestTickerSnapshot[], config: PricePercChangConfig): NormalizedRestTickerSnapshot[] {
		return data.filter((ticker) => ticker.change_pct__nz_tick >= config.pricePercChangeThreshold);
	}
}
