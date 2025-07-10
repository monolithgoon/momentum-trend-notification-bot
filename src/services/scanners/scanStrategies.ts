import { PolygonTickerSnapshot } from "../../market_data_providers/polygon/interfaces/polygonTicker.interface";


export interface ScanStrategy<TConfig = unknown> {
	name: string;
	description?: string;
	runFilter(data: PolygonTickerSnapshot[], config: TConfig): string[];
}

export interface VolumePecScanConfig {
	volumeThreshold: number;
	changePercentageThreshold: number;
}


export class VolumeChangeScanStrategy implements ScanStrategy<VolumePecScanConfig> {
	name = "volumeAndChange";

	runFilter(data: PolygonTickerSnapshot[], config: VolumePecScanConfig): string[] {
		return data
			.filter(
				(ticker) =>
					ticker.tradingVolume?.v >= config.volumeThreshold &&
					ticker.priceChangeTodayPerc >= config.changePercentageThreshold
			)
			.map((ticker) => ticker.tickerName);
	}
}

export interface PriceSpikeConfig {
  minPriceJump: number;
}

export class PriceSpikeStrategy implements ScanStrategy<PriceSpikeConfig> {
  name = "priceSpike";

  runFilter(data: PolygonTickerSnapshot[], config: PriceSpikeConfig): string[] {
    return data
      .filter((t) => {
        const high = t.currentDayStats?.h ?? 0;
        const low = t.currentDayStats?.l ?? 0;
        return (high - low) > config.minPriceJump;
      })
      .map((t) => t.tickerName);
  }
}

export interface PricePercChangConfig {
	pricePercChangeThreshold: number;
}

export class PriceChangeScanStrategy implements ScanStrategy {
	name = "priceChange";

	runFilter(data: PolygonTickerSnapshot[], config: PricePercChangConfig): string[] {
		return data
			.filter((ticker) => ticker.priceChangeTodayPerc >= config.pricePercChangeThreshold)
			.map((ticker) => ticker.tickerName);
	}
}