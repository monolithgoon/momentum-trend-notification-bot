import { SortOrder } from "@core/enums/sortOrder.enum";
import { GenericTickerSorter } from "@core/generics/GenericTickerSorter.interface";
import { LeaderboardRestTickerSnapshot } from "@core/models/LeaderboardRestTickerSnapshot.interface";

type LeaderboardSortableField = keyof Pick<
	LeaderboardRestTickerSnapshot,
	| "leaderboard_momentum_score"
	| "pct_change_velocity__ld_tick"
	| "pct_change_acceleration__ld_tick"
	| "volume_velocity__ld_tick"
	| "volume_acceleration__ld_tick"
>;

type LeaderboardSortFieldType = Extract<
  keyof LeaderboardRestTickerSnapshot,
  | "leaderboard_momentum_score"
  | "pct_change_velocity__ld_tick"
  | "pct_change_acceleration__ld_tick"
  | "volume_velocity__ld_tick"
  | "volume_acceleration__ld_tick"
>;

const LEADERBOARD_SORT_FIELDS = [
  "leaderboard_momentum_score",
  "pct_change_velocity__ld_tick",
  "pct_change_acceleration__ld_tick",
  "volume_velocity__ld_tick",
  "volume_acceleration__ld_tick",
] as const;

type ValidateKeys<T, K extends readonly string[]> = K[number] extends keyof T ? true : "❌ Invalid field in array";

type AssertLeaderboardSortFieldKeysValid = ValidateKeys<LeaderboardRestTickerSnapshot, typeof LEADERBOARD_SORT_FIELDS>;


export class LeaderboardTickersSorter
	implements GenericTickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot>
{
	constructor(
		private readonly sortField: LeaderboardSortableField,
		private readonly sortOrder: SortOrder = SortOrder.DESC
	) {}

	sort(snapshots: LeaderboardRestTickerSnapshot[]): LeaderboardRestTickerSnapshot[] {
		const multiplier = this.sortOrder === SortOrder.ASC ? 1 : -1;

		return snapshots
			.slice()
			.sort((a, b) => multiplier * (((a[this.sortField] ?? 0) as number) - ((b[this.sortField] ?? 0) as number)));
	}
}
