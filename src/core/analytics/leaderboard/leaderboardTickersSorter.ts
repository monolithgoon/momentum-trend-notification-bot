import { SortOrder } from "@core/enums/sortOrder.enum";
import { GenericTickerSorter } from "@core/generics/GenericTickerSorter.interface";
import { LeaderboardRestTickerSnapshot } from "@core/data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";


type LeaderboardSortableField = keyof Pick<LeaderboardRestTickerSnapshot, "leaderboard_momentum_score" | "pct_change_velocity__ld_tick" | "pct_change_acceleration__ld_tick" | "volume_velocity__ld_tick" | "volume_acceleration__ld_tick">;

export class LeaderboardTickersSorter implements GenericTickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot> {
  constructor(
    private readonly sortField: LeaderboardSortableField,
    private readonly sortOrder: SortOrder = SortOrder.DESC
  ) {}

  sort(snapshots: LeaderboardRestTickerSnapshot[]): LeaderboardRestTickerSnapshot[] {
    const multiplier = this.sortOrder === SortOrder.ASC ? 1 : -1;

    return snapshots
      .slice()
      .sort(
        (a, b) =>
          multiplier *
          (((a[this.sortField] ?? 0) as number) - ((b[this.sortField] ?? 0) as number))
      );
  }
}