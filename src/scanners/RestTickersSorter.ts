// strategies/ScoreSortingStrategy.ts

import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { RankedRestTickerSnapshot } from "@data/snapshots/rest_api/types/RankedRestTickerSnapshot.interface";

export type ScanSortableField = keyof Pick<NormalizedRestTickerSnapshot, "change_pct" | "volume" | "price">;
export type SortOrder = "asc" | "desc";

export interface RestTickerSorter {
	sort(snapshots: NormalizedRestTickerSnapshot[]): RankedRestTickerSnapshot[];
}

// REMOVE - REPLACED
// export class RestTickersSorter implements RestTickerSorter {
// 	constructor(
// 		private readonly sortField: ScanSortableField = "change_pct",
// 		private readonly sortOrder: SortOrder = "desc"
// 	) {}

// 	sort(snapshots: NormalizedRestTickerSnapshot[]): RankedRestTickerSnapshot[] {
// 		const multiplier = this.sortOrder === "asc" ? 1 : -1;

// 		// Step 1: attach initialScanRank based on input order
// 		const ranked: RankedRestTickerSnapshot[] = snapshots.map((s, i) => ({
// 			...s,
// 			initial_scan_list_rank: i,
// 			sorted_scan_rank: 0,
// 		}));

// 		// Step 2: sort by specified field
// 		ranked.sort((a, b) => multiplier * (((a[this.sortField] ?? 0) as number) - ((b[this.sortField] ?? 0) as number)));

// 		// Step 3: assign sorted_scan_rank
// 		return ranked.map((s, idx) => ({
// 			...s,
// 			sorted_scan_rank: idx + 1,
// 		}));
// 	}
// }

export class RestTickersSorter implements RestTickerSorter {
	constructor(private readonly sortField?: ScanSortableField, private readonly sortOrder: SortOrder = "desc") {}

	sort(snapshots: NormalizedRestTickerSnapshot[]): RankedRestTickerSnapshot[] {
		// Step 1: attach initialScanRank
		const ranked: RankedRestTickerSnapshot[] = snapshots.map((snapshot, idx) => ({
			...snapshot,
			initial_scan_list_rank: idx,
			sorted_scan_rank: 0,
		}));

		// Step 2: sort by field (if provided), else keep input order
		if (this.sortField) {
			const multiplier = this.sortOrder === "asc" ? 1 : -1;

			ranked.sort(
				(a, b) => multiplier * (((a[this.sortField!] ?? 0) as number) - ((b[this.sortField!] ?? 0) as number))
			);
		}

		// Step 3: assign sorted_scan_rank (sorted order)
		return ranked.map((snapshot, idx) => ({
			...snapshot,
			sorted_scan_rank: idx + 1,
		}));
	}
}
