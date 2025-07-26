import { SnapshotTransformer } from "@core/models/transformers/types/SnapshotTransformer.interface";
import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";

export interface RawRestApiTickerTransformer<TIn>
  extends SnapshotTransformer<TIn, NormalizedRestTickerSnapshot> {
  transform(snapshot: TIn, ingestion_ordinal_position: number): NormalizedRestTickerSnapshot; 
}
