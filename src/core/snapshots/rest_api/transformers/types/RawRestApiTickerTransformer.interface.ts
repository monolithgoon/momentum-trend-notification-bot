import { DefaultTickerSnapshotTransformer } from "@core/snapshots/DefaultTickerSnapshotTransformer.interface";
import { NormalizedRestTickerSnapshot } from "../../types/NormalizedRestTickerSnapshot.interface";

export interface RawRestApiTickerTransformer<TIn>
  extends DefaultTickerSnapshotTransformer<TIn, NormalizedRestTickerSnapshot> {
    // TODO -> use better vaiable names
  transform(snapshot: TIn, primitive_ordinal_position: number): NormalizedRestTickerSnapshot; 
}
