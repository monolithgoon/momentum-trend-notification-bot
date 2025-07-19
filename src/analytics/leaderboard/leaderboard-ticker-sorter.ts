import { SortOrder } from "@core/enums/sortOrder.enum";
import { TickerSorter } from "@core/interfaces/tickerSorter.interface";
import { LeaderboardRestTickerSnapshot } from "@data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";


type LeaderboardSortableField = keyof Pick<LeaderboardRestTickerSnapshot, "score" | "velocity" | "acceleration">;

export class LeaderboardSnapshotSorter implements TickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot> {
  constructor(
    private readonly sortField: LeaderboardSortableField = "score",
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