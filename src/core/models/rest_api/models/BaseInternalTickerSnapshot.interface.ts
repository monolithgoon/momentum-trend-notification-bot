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
	// REMOVE -> unnecessary fields
	// ingestion_ordinal_index: number;
	// computed_ordinal_index: number;
}
