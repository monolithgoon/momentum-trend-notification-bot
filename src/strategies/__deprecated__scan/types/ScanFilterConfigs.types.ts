import { PriceChangeScanFilter, PriceSpikeConfig, VolumeChangeScanFilter, VolumePctChangeConfig } from "../../__deprecated__filter/normalizedTickerScanFilters";


export type ScanFilterConfigTypes =
	| { scanFilter: VolumeChangeScanFilter; config: VolumePctChangeConfig }
	| { scanFilter: PriceChangeScanFilter; config: PriceSpikeConfig };
// Add more as you add more filters

