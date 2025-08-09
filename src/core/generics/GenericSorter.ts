import { SortOrder } from "@core/enums/SortOrder.enum";

// REMOVE - DEPRECATED
// export class RankedTickersSorter {
// 	constructor(private readonly sortField: ScanSortableField, private readonly sortOrder: SortOrder = SortOrder.DESC) {}

// 	sort(snapshots: SortedNormalizedTickerSnapshot[]): SortedNormalizedTickerSnapshot[] {
// 		if (!this.sortField) return snapshots.slice();

// 		const multiplier = this.sortOrder === SortOrder.ASC ? 1 : -1;

// 		// 2. Sort by field
// 		const sorted = snapshots
// 			.slice() // Create a shallow copy to avoid mutating the original array
// 			.sort((a, b) => multiplier * (((a[this.sortField!] ?? 0) as number) - ((b[this.sortField!] ?? 0) as number)));

// 		// Step 3: Re-assign ordinal_sort_position (sorted order)
// 		return sorted.map((snapshot, idx) => ({
// 			...snapshot,
// 			ordinal_sort_position: idx + 1, // 1-based position
// 		}));
// 	}
// }

/**
 * GenericSorter
 * 
 * A utility class for sorting an array of objects by a given field, order, and assigning 
 * an ordinal sort position to each item. This is useful for ranking items in a leaderboard 
 * or any sorted list, without mutating the original array.
 * 
 * Type Parameters:
 *   T - The object type being sorted (must have string keys).
 *   F - The field name in T used for sorting.
 *   P - The name of the field to assign the ordinal position (default: "ordinal_sort_position").
 * 
 * Constructor Arguments:
 *   sortField           - The field to sort by (e.g., "score", "change_pct").
 *   sortOrder           - The sort order (SortOrder.ASC or SortOrder.DESC).
 *   ordinalSortPosition - The name of the field to assign the 1-based position (default: "ordinal_sort_position").
 * 
 * The 'multiplier' variable determines sorting direction:
 *   - If sortOrder is ASC, multiplier is 1 (ascending).
 *   - If sortOrder is DESC, multiplier is -1 (descending).
 *   - This allows using a single comparison function for both directions.
 * 
 * The 'sort' method returns the sorted array with each item assigned its ordinal position.
 */
export class GenericSorter<
  T extends Record<string, any>,
  F extends keyof T,
  P extends string = "ordinal_sort_position"
> {
  constructor(
    private readonly sortField: F,
    private readonly sortOrder: SortOrder = SortOrder.DESC,
    private readonly ordinalSortPosition: P = "ordinal_sort_position" as P // default position field is "ordinal_sort_position"
  ) {}

  /**
   * Sorts the items array by the specified field and order,
   * then assigns an ordinal position field to each item (1-based).
   * 
   * @param items - Array of objects to be sorted and ranked.
   * @returns The sorted array, with each object assigned its sort position.
   */
  sort(items: T[]): (T & { [K in P]: number })[] {
    // multiplier determines sort direction: 1 for ascending, -1 for descending
    const multiplier = this.sortOrder === SortOrder.ASC ? 1 : -1;
    const sorted = items
      .slice() // non-mutating
      .sort(
        (a, b) =>
          multiplier *
          (((a[this.sortField] ?? 0) as number) - ((b[this.sortField] ?? 0) as number))
      );

    // Assign the ordinal sort position (1-based) to each item
    return sorted.map((item, idx) => ({
      ...item,
      [this.ordinalSortPosition]: idx + 1,
    }));
  }
}

/**
 * Rationale: From Specific to Generic Sorting Abstractions
 *
 * Originally, sorting was tightly coupled to specific data types and fields. for example, the 'ScanSortableField'
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
 * Previously, sorting implementations like LeaderboardTickerSnapshotsSorter were tightly coupled to a specific data structure (e.g., LeaderboardRestTickerSnapshot)
 * and a limited set of sortable fields (defined as type LeaderboardSortableField = keyof Pick<LeaderboardRestTickerSnapshot, "leaderboard_momentum_score" | "perc_change_velocity" | "pct_change_acceleration">).
 * This approach required creating a new sorter class and a dedicated field union type for each new data shape, leading to code duplication
 * and limited flexibility.
 *
 * The dedicated LeaderboardTickerSnapshotsSorter, for example, hardcoded the item type and sortable fields, making it inflexible and unreusable for other data structures.
 *
 * By introducing a generic field sorter abstraction using TypeScript generics, we:
 *   - Allow sorting any array of objects, as long as the field exists on the object.
 *   - Eliminate the need for custom sorter classes and specific union types for each data structure.
 *   - Ensure type safety by constraining the sortable field ('F extends keyof T') to valid keys of the provided type.
 *   - Enable code reuse and easier maintenance, as the same sorting logic works across different contexts (e.g., tickers, leaderboards, etc.).
 *
 * In summary, the generic sorter abstracts away the need for specific implementations like LeaderboardTickerSnapshotsSorter
 * and field unions like LeaderboardSortableField, enabling reusable, maintainable, and type-safe sorting logic for any object-based data in the codebase.
 */

// type LeaderboardSortableField = keyof Pick<LeaderboardRestTickerSnapshot, "leaderboard_momentum_score" | "perc_change_velocity" | "pct_change_acceleration">;

// export class LeaderboardTickerSnapshotsSorter implements GenericTickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot> {
// 	constructor(
// 		private readonly sortField: LeaderboardSortableField = "leaderboard_momentum_score",
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
