
export interface DefaultTickerSnapshotTransformer<TIn, TOut> {
  transform(snapshot: TIn): TOut;
}