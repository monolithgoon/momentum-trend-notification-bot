import { SnapshotTransformer } from "@core/models/rest_api/transformers/types/SnapshotTransformer.interface";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";

export interface RawRestApiTickerTransformer<TIn>
  extends SnapshotTransformer<TIn, NormalizedRestTickerSnapshot> {
  transform(snapshot: TIn, ingestionOrdinalIndex: number): NormalizedRestTickerSnapshot; 
}
