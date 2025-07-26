import { NormalizedRestTickerSnapshot } from "./NormalizedRestTickerSnapshot.interface";

export interface SortedNormalizedTicker extends NormalizedRestTickerSnapshot {
	ordinal_sort_position: number
}