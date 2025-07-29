import { SnapshotTransformer } from "@core/models/rest_api/transformers/types/SnapshotTransformer.interface";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";

/**
 Specialized transformer for normalized REST API snapshot inputs 
 */
export interface NormalizedRestTickerSnapshotTransformer<T>
	extends SnapshotTransformer<NormalizedRestTickerSnapshot, T> {
	transform(snapshot: NormalizedRestTickerSnapshot): T;
}
