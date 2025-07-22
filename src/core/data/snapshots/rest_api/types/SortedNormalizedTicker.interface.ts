import { NormalizedRestTickerSnapshot } from "./NormalizedRestTickerSnapshot.interface";

export interface SortedNormalizedTicker extends NormalizedRestTickerSnapshot {
	sort_rank: number
	// ordinal_sort_rank: number;
	// ordinal_sort_position: number;
}