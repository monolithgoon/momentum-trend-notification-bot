import { PriceChangeScanFilter, PriceSpikeConfig, VolumeChangeScanFilter, VolumePctChangeConfig } from "../../filter/normalizedTickerScanFilters";


export type ScanFilterConfigTypes =
	| { scanFilter: VolumeChangeScanFilter; config: VolumePctChangeConfig }
	| { scanFilter: PriceChangeScanFilter; config: PriceSpikeConfig };
// Add more as you add more filters

