import { InternalTickerSnapshot } from "src/core/interfaces/internalTickerSnapshot.interface";

export interface ScanFilter<TConfig = unknown> {
  name: string;
  description?: string;
  runFilter(data: InternalTickerSnapshot[], config: TConfig): InternalTickerSnapshot[];
}
