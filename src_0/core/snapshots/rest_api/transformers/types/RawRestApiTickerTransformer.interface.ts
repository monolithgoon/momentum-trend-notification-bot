import { SnapshotTransformer } from "@core/snapshots/SnapshotTransformer.interface";
import { NormalizedRestTickerSnapshot } from "../../types/NormalizedRestTickerSnapshot.interface";

export interface RawRestApiTickerTransformer<TIn>
  extends SnapshotTransformer<TIn, NormalizedRestTickerSnapshot> {
  transform(snapshot: TIn, ingestion_ordinal_position: number): NormalizedRestTickerSnapshot; 
}
