import { PriceChangeScanFilter, PriceSpikeConfig, VolumeChangeScanFilter, VolumePricePctChangeConfig } from "@core/scanners/scanFilters";

export type scanScreenerConfigTypes =
	| { scanFilter: VolumeChangeScanFilter; config: VolumePricePctChangeConfig }
	| { scanFilter: PriceChangeScanFilter; config: PriceSpikeConfig };
// Add more as you add more filters

