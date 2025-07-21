import { DefaultTickerSnapshotTransformer } from "@core/data/snapshots/DefaultTickerSnapshotTransformer.interface";
import { NormalizedRestTickerSnapshot } from "../../types/NormalizedRestTickerSnapshot.interface";

export interface RawRestApiTickerTransformer<TIn>
  extends DefaultTickerSnapshotTransformer<TIn, NormalizedRestTickerSnapshot> {
  transform(snapshot: TIn, sortRank: number): NormalizedRestTickerSnapshot;
}
