import { SnapshotTransformer } from "@core/models/rest_api/transformers/types/SnapshotTransformer.interface";
import { NormalizedRestTickerSnapshot } from "../../NormalizedRestTickerSnapshot.interface";

/**
 * Interface for transforming raw REST API ticker snapshots into normalized format.
 *
 * @template TIn - The type of the input raw snapshot.
 */

export interface RawRestApiTckerSnapshotTransformer<TIn>
	extends SnapshotTransformer<TIn, NormalizedRestTickerSnapshot> {
	/** Must be a constant identifying the vendor name */
	readonly VENDOR_NAME: string;
	transform(snapshot: TIn, ingestionOrdinalIndex: number): NormalizedRestTickerSnapshot;
}
