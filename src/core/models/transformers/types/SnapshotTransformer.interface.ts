export interface SnapshotTransformer<TIn, TOut> {
  transform(snapshot: TIn, ingestion_ordinal_position: number): TOut;
}