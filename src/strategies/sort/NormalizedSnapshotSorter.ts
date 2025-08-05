import { SortOrder } from "@core/enums/SortOrder.enum";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";
import { SortedNormalizedTickerSnapshot } from "@core/models/rest_api/SortedNormalizedTickerSnapshot.interface";
import { NormalizedSortableFieldType } from "../../core/models/snapshotFieldTypeAssertions";

export class NormalizedSnapshotSorter {
	constructor(
		private readonly sortField: NormalizedSortableFieldType,
		private readonly sortOrder: SortOrder = SortOrder.DESC
	) {}

	public sort(snapshots: NormalizedRestTickerSnapshot[]): SortedNormalizedTickerSnapshot[] {
		return [...snapshots]
			.sort((a, b) => {
				const aVal = a[this.sortField];
				const bVal = b[this.sortField];
				return this.sortOrder === SortOrder.ASC
					? (aVal as number) - (bVal as number)
					: (bVal as number) - (aVal as number);
			})
			.map((snapshot, index) => ({
				...snapshot,
				sort_ordinal_index: index,
			}));
	}
}
