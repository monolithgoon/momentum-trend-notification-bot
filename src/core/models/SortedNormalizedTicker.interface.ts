import { NormalizedRestTickerSnapshot } from "./NormalizedRestTickerSnapshot.interface";

// ????? why do I have this interface?
export interface SortedNormalizedTicker extends NormalizedRestTickerSnapshot {
	ordinal_sort_position: number;
}

/**
 * Marker Interface:
 * An interface with no members, used to tag or label a type with semantic meaning rather than enforce structure.
 *
 * Benefits:
 * - Provides a way to categorize or identify types at compile time.
 * - Enables future-proofing: shared fields can be added later, and all implementing types will inherit them automatically.
 * - Useful for type constraints and code organization without imposing structure.
 */
export interface BaseInternalTickerSnapshot {
	ordinal_sort_position: number; // 1-based position
}
