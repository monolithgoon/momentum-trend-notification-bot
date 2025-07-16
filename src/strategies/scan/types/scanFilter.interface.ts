import { InternalTickerSnapshot } from "src/data/snapshots/types/internalTickerSnapshot.interface";

export interface ScanFilter<TConfig = unknown> {
  name: string;
  description?: string;
  runFilter(data: InternalTickerSnapshot[], config: TConfig): InternalTickerSnapshot[];
}
