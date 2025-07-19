import { NormalizedRestTickerSnapshot } from "./NormalizedRestTickerSnapshot.interface";

export interface RankedRestTickerSnapshot extends NormalizedRestTickerSnapshot {
	initial_scan_list_rank: number;
	sorted_scan_rank: number;
}
