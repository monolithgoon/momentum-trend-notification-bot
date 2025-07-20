import { PriceChangeScanFilter, PriceSpikeConfig, VolumeChangeScanFilter, VolumePricePctChangeConfig } from "@scanners/scanFilters";

export type screenerConfigTypes =
	| { scanFilter: VolumeChangeScanFilter; config: VolumePricePctChangeConfig }
	| { scanFilter: PriceChangeScanFilter; config: PriceSpikeConfig };
// Add more as you add more filters

