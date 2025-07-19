import { DefaultTickerSnapshotTransformer } from "@data/snapshots/DefaultTickerSnapshotTransformer.interface";
import { NormalizedRestTickerSnapshot } from "../../types/NormalizedRestTickerSnapshot.interface";

export interface RawRestApTickerTransformer<TIn>
  extends DefaultTickerSnapshotTransformer<TIn, NormalizedRestTickerSnapshot> {
  transform(snapshot: TIn): NormalizedRestTickerSnapshot;
}
