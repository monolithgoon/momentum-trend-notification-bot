import { NormalizedRestTickerSnapshot } from "./NormalizedRestTickerSnapshot.interface";

export interface RankedRestTickerSnapshot extends NormalizedRestTickerSnapshot {
	sort_rank: number;
}