import { NormalizedRestTickerSnapshot } from "./NormalizedRestTickerSnapshot.interface";

/**
 * Represents a normalized ticker snapshot with an additional sort ordinal index.
 * 
 * This interface extends {@link NormalizedRestTickerSnapshot} by adding a `sort_ordinal_index`
 * property, which indicates the 0-based position of the ticker in a sorted list.
 * 
 * @remarks
 * Used for managing and referencing sorted normalized tickers, where the order is significant.
 *
 * @property sort_ordinal_index - The 0-based index representing the ticker's position in a sorted array.
 */
export interface SortedNormalizedTickerSnapshot extends NormalizedRestTickerSnapshot {
	sort_ordinal_index: number; // 0-based index for sorting
}
