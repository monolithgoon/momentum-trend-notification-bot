import { InternalTickerSnapshot } from "../../types/internalTickerSnapshot.interface";

export interface TickerSnapshotTransformer<T> {
	transform(snapshot: T): InternalTickerSnapshot;
}