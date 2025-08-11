import { SnapshotTransformer } from "@core/models/rest_api/transformers/types/SnapshotTransformer.interface";
import { NormalizedRestTickerSnapshot } from "../../NormalizedRestTickerSnapshot.interface";

/**
 Specialized transformer for normalized REST API snapshot inputs 
 */

export interface NormalizedRestTickerSnapshotTransformer<TOut>
  extends SnapshotTransformer<NormalizedRestTickerSnapshot, TOut> {
  transform(snapshot: NormalizedRestTickerSnapshot): TOut;
}
