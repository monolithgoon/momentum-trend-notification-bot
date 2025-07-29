export interface SnapshotTransformer<TIn, TOut> {
  transform(snapshot: TIn, ingestionOrdinalIndex: number): TOut;
}