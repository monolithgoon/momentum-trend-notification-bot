/** NoOutlierFilter — placeholder policy */
import type { Snapshot } from "../../engine/types";
export interface OutlierPolicy { filter(series: Snapshot[]): Snapshot[]; }
export class NoOutlierFilter implements OutlierPolicy {
  filter(series: Snapshot[]): Snapshot[] { return series; }
}
