import { SortOrder } from "@core/enums/sortOrder.enum";

// REMOVE - DEPRECATED
// export class RankedTickersSorter {
// 	constructor(private readonly sortField: ScanSortableField, private readonly sortOrder: SortOrder = SortOrder.DESC) {}

// 	sort(snapshots: SortedNormalizedTicker[]): SortedNormalizedTicker[] {
// 		if (!this.sortField) return snapshots.slice();

// 		const multiplier = this.sortOrder === SortOrder.ASC ? 1 : -1;

// 		// 2. Sort by field
// 		const sorted = snapshots
// 			.slice() // Create a shallow copy to avoid mutating the original array
// 			.sort((a, b) => multiplier * (((a[this.sortField!] ?? 0) as number) - ((b[this.sortField!] ?? 0) as number)));

// 		// Step 3: Re-assign sort_rank (sorted order)
// 		return sorted.map((snapshot, idx) => ({
// 			...snapshot,
// 			sort_rank: idx + 1, // 1-based rank
// 		}));
// 	}
// }

export class GenericRankedItemsFieldSorter<
	T extends Record<string, any>,
	F extends keyof T,
	R extends string = "sort_rank"
> {
	constructor(
		private readonly sortField: F,
		private readonly sortOrder: SortOrder = SortOrder.DESC,
		private readonly rankField: R = "sort_rank" as R // default rank field is "sort_rank"
	) {}

	sort(items: T[]): (T & { [K in R]: number })[] {
		const multiplier = this.sortOrder === SortOrder.ASC ? 1 : -1;
		const sorted = items
			.slice()
			.sort((a, b) => multiplier * (((a[this.sortField] ?? 0) as number) - ((b[this.sortField] ?? 0) as number)));

		// assign ranking field
		return sorted.map((item, idx) => ({
			...item,
			[this.rankField]: idx + 1, // 1-based rank
		}));
	}
}

/**
 * Rationale: From Specific to Generic Sorting Abstractions
 *
 * Originally, sorting was tightly coupled to specific data types and fields. For example, the 'ScanSortableField'
 * type limited sorting to specific properties ("change_pct", "volume", "price") of the NormalizedRestTickerSnapshot object.
 * This meant each new data structure or context (like a leaderboard, or a different ticker format) required
 * its own dedicated sorter class and field type, leading to code duplication, limited reuse, and more maintenance.
 *
 * To address this, we introduced a generic sorting abstraction using TypeScript generics.
 * The generic sorter takes two type parameters:
 *   - T: the item type to be sorted (e.g., any object shape)
 *   - F: a key of T, representing the sortable field
 *
 * This approach allows us to:
 *   - Sort any array of objects, regardless of their specific shape, as long as the field exists on the object.
 *   - Eliminate the need for custom sorter classes and field union types for each data structure.
 *   - Ensure type safety: the generic constraint 'F extends keyof T' guarantees that only valid fields can be used for sorting.
 *   - Easily add ranking or other post-processing steps in a type-safe way.
 *
 * In summary, the generic sorter abstracts away the need for per-type sorters and field unions (like ScanSortableField),
 * enabling reusable, maintainable, and type-safe sorting logic for any object-based data in the codebase.
 */

/**
 * Rationale: From Specific to Generic Sorting Abstractions
 *
 * Previously, sorting implementations like LeaderboardTickersSorter were tightly coupled to a specific data structure (e.g., LeaderboardRestTickerSnapshot)
 * and a limited set of sortable fields (defined as type LeaderboardSortableField = keyof Pick<LeaderboardRestTickerSnapshot, "score" | "velocity" | "acceleration">).
 * This approach required creating a new sorter class and a dedicated field union type for each new data shape, leading to code duplication
 * and limited flexibility.
 *
 * The dedicated LeaderboardTickersSorter, for example, hardcoded the item type and sortable fields, making it inflexible and unreusable for other data structures.
 *
 * By introducing a generic field sorter abstraction using TypeScript generics, we:
 *   - Allow sorting any array of objects, as long as the field exists on the object.
 *   - Eliminate the need for custom sorter classes and specific union types for each data structure.
 *   - Ensure type safety by constraining the sortable field ('F extends keyof T') to valid keys of the provided type.
 *   - Enable code reuse and easier maintenance, as the same sorting logic works across different contexts (e.g., tickers, leaderboards, etc.).
 *
 * In summary, the generic sorter abstracts away the need for specific implementations like LeaderboardTickersSorter
 * and field unions like LeaderboardSortableField, enabling reusable, maintainable, and type-safe sorting logic for any object-based data in the codebase.
 */

// type LeaderboardSortableField = keyof Pick<LeaderboardRestTickerSnapshot, "score" | "velocity" | "acceleration">;

// export class LeaderboardTickersSorter implements GenericTickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot> {
// 	constructor(
// 		private readonly sortField: LeaderboardSortableField = "score",
// 		private readonly sortOrder: SortOrder = SortOrder.DESC
// 	) {}

// 	sort(snapshots: LeaderboardRestTickerSnapshot[]): LeaderboardRestTickerSnapshot[] {
// 		const multiplier = this.sortOrder === SortOrder.ASC ? 1 : -1;

// 		return snapshots
// 			.slice()
// 			.sort(
// 				(a, b) =>
// 					multiplier *
// 					(((a[this.sortField] ?? 0) as number) - ((b[this.sortField] ?? 0) as number))
// 			);
// 	}
// }
