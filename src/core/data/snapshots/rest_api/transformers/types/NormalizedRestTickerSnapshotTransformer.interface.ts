import { DefaultTickerSnapshotTransformer } from "@core/data/snapshots/DefaultTickerSnapshotTransformer.interface";
import { NormalizedRestTickerSnapshot } from "../../types/NormalizedRestTickerSnapshot.interface";

/**
 // Specialized transformer for REST-normalized snapshot inputs 
You’re allowing an optional rank, which makes sense for things like leaderboards.
 */
export interface NormalizedRestTickerSnapshotTransformer<T>
	extends DefaultTickerSnapshotTransformer<NormalizedRestTickerSnapshot, T> {
	transform(snapshot: NormalizedRestTickerSnapshot): T;
}
