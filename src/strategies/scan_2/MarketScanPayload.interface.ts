import { SortedNormalizedTickerSnapshot } from "@core/models/rest_api/SortedNormalizedTickerSnapshot.interface";

export interface MarketScanPayload {
	snapshots: SortedNormalizedTickerSnapshot[];
	tickerNames: string[];
	marketScanStrategyPresetKeys: string[];
	correlationId: string;
	timestampMs: number;
}
