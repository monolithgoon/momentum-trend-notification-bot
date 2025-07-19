import { SortOrder } from "@core/enums/sortOrder.enum";
import { TickerSorter } from "@core/interfaces/tickerSorter.interface";
import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { RankedRestTickerSnapshot } from "@data/snapshots/rest_api/types/RankedRestTickerSnapshot.interface";

export type ScanSortableField = keyof Pick<NormalizedRestTickerSnapshot, "change_pct" | "volume" | "price">;

export class RestTickersSorter implements TickerSorter<NormalizedRestTickerSnapshot, RankedRestTickerSnapshot> {
  constructor(
    private readonly sortField: ScanSortableField,
    private readonly sortOrder: SortOrder = SortOrder.DESC
  ) {}

  sort(snapshots: NormalizedRestTickerSnapshot[]): RankedRestTickerSnapshot[] {
    // Step 1: attach initialScanRank
    const ranked: RankedRestTickerSnapshot[] = snapshots.map((snapshot, idx) => ({
      ...snapshot,
      initial_scan_list_rank: idx,
      sorted_scan_rank: 0,
    }));

    // Step 2: sort by field (if provided), else keep input order
    if (this.sortField) {
      const multiplier = this.sortOrder === SortOrder.ASC ? 1 : -1;

      ranked.sort(
        (a, b) =>
          multiplier *
          (((a[this.sortField!] ?? 0) as number) - ((b[this.sortField!] ?? 0) as number))
      );
    }

    // Step 3: assign sorted_scan_rank (sorted order)
    return ranked.map((snapshot, idx) => ({
      ...snapshot,
      sorted_scan_rank: idx + 1,
    }));
  }
}