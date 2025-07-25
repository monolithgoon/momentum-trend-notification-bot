
export interface DefaultTickerSnapshotTransformer<TIn, TOut> {
  transform(snapshot: TIn, primitive_ordinal_position: number): TOut;
}