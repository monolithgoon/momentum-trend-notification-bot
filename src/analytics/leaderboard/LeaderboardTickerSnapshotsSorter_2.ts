import { SortOrder } from "@core/enums/SortOrder.enum";
import { ILeaderboardTickerSnapshot } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface";
import { LeaderboardSortFieldType_2 } from "@core/models/snapshotFieldTypeAssertions";

export type FieldSortConfig = {
	field: LeaderboardSortFieldType_2;
	order?: SortOrder; // default = ASC
};

export class LeaderboardTickerSnapshotsSorter_2 {
	constructor(
		private readonly primaryField: LeaderboardSortFieldType_2 = "aggregate_kinetics_rank",
		private readonly primaryOrder: SortOrder = SortOrder.ASC,
		private readonly tieBreakerFields: FieldSortConfig[] = []
	) {}

	sort(snapshots: ILeaderboardTickerSnapshot[]): ILeaderboardTickerSnapshot[] {
		return snapshots.slice().sort((a, b) => {
			// Step 1: Sort by primary field (default is aggregate_kinetics_rank)
			const aPrimary = Number(a[this.primaryField] ?? Infinity);
			const bPrimary = Number(b[this.primaryField] ?? Infinity);
			if (aPrimary !== bPrimary) {
				const multiplier = this.primaryOrder === SortOrder.ASC ? 1 : -1;
				return multiplier * (aPrimary - bPrimary);
			}

			// Step 2: Tie-breakers in priority order
			for (const { field, order = SortOrder.ASC } of this.tieBreakerFields) {
				const aVal = Number(a[field] ?? Infinity);
				const bVal = Number(b[field] ?? Infinity);
				if (aVal !== bVal) {
					const multiplier = order === SortOrder.ASC ? 1 : -1;
					return multiplier * (aVal - bVal);
				}
			}

			// Step 3: Final fallback by ticker symbol for stable sort
			return a.ticker_symbol__ld_tick.localeCompare(b.ticker_symbol__ld_tick);
		});
	}
}
