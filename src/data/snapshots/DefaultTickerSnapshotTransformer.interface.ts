
export interface DefaultTickerSnapshotTransformer<TIn, TOut> {
  transform(snapshot: TIn, sortRank: number): TOut;
}