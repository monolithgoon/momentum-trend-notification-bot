import { InternalTickerSnapshot } from "./internalTickerSnapshot.interface";

export interface TickerSnapshotTransformer<T> {
	transform(snapshot: T): InternalTickerSnapshot;
}