import { SortOrder } from "@core/enums/sortOrder.enum";
import { TickerSorter } from "@core/interfaces/tickerSorter.interface";
import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { RankedRestTickerSnapshot } from "@data/snapshots/rest_api/types/RankedRestTickerSnapshot.interface";

export type ScanSortableField = keyof Pick<NormalizedRestTickerSnapshot, "change_pct" | "volume" | "price">;

export class __deprecatd__RestTickersSorter
	implements TickerSorter<NormalizedRestTickerSnapshot, RankedRestTickerSnapshot>
{
	constructor(private readonly sortField: ScanSortableField, private readonly sortOrder: SortOrder = SortOrder.DESC) {}

	sort(snapshots: NormalizedRestTickerSnapshot[]): RankedRestTickerSnapshot[] {
		// Step 1: attach initialScanRank
		const ranked: RankedRestTickerSnapshot[] = snapshots.map((snapshot, idx) => ({
			...snapshot,
			sort_rank: idx, // 0-based rank from initial scan
		}));

		// Step 2: sort by field (if provided), else keep input order
		if (this.sortField) {
			const multiplier = this.sortOrder === SortOrder.ASC ? 1 : -1;

			ranked.sort(
				(a, b) => multiplier * (((a[this.sortField!] ?? 0) as number) - ((b[this.sortField!] ?? 0) as number))
			);
		}

		// Step 3: assign sort_rank (sorted order)
		return ranked.map((snapshot, idx) => ({
			...snapshot,
			sort_rank: idx + 1, // 1-based rank
		}));
	}
}

export class RankedTickersSorter {
	constructor(private readonly sortField: ScanSortableField, private readonly sortOrder: SortOrder = SortOrder.DESC) {}

	sort(snapshots: RankedRestTickerSnapshot[]): RankedRestTickerSnapshot[] {
		if (!this.sortField) return snapshots.slice();

		const multiplier = this.sortOrder === SortOrder.ASC ? 1 : -1;

		// 2. Sort by field
		const sorted = snapshots
			.slice() // Create a shallow copy to avoid mutating the original array
			.sort((a, b) => multiplier * (((a[this.sortField!] ?? 0) as number) - ((b[this.sortField!] ?? 0) as number)));

		// Step 3: Re-assign sort_rank (sorted order)
		return sorted.map((snapshot, idx) => ({
			...snapshot,
			sort_rank: idx + 1, // 1-based rank
		}));
	}
}