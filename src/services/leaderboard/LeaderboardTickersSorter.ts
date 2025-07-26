import { SortOrder } from "@core/enums/sortOrder.enum";
import { GenericTickerSorter } from "@core/generics/GenericTickerSorter.interface";
import { LeaderboardRestTickerSnapshot } from "@core/models/LeaderboardRestTickerSnapshot.interface";
import { LeaderboardSortFieldType } from "@core/types/type-assertions";

export class LeaderboardTickersSorter
	implements GenericTickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot>
{
	constructor(
		private readonly sortField: LeaderboardSortFieldType,
		private readonly sortOrder: SortOrder = SortOrder.DESC
	) {}

	sort(snapshots: LeaderboardRestTickerSnapshot[]): LeaderboardRestTickerSnapshot[] {
		const multiplier = this.sortOrder === SortOrder.ASC ? 1 : -1;

		return snapshots
			.slice()
			.sort((a, b) => multiplier * (((a[this.sortField] ?? 0) as number) - ((b[this.sortField] ?? 0) as number)));
	}
}
