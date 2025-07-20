import { DefaultTickerSnapshotTransformer } from "@data/snapshots/DefaultTickerSnapshotTransformer.interface";
import { NormalizedRestTickerSnapshot } from "@core/types/NormalizedRestTickerSnapshot.interface";

export interface RawRestApiTickerTransformer<TIn>
  extends DefaultTickerSnapshotTransformer<TIn, NormalizedRestTickerSnapshot> {
  transform(snapshot: TIn, sortRank: number): NormalizedRestTickerSnapshot;
}
