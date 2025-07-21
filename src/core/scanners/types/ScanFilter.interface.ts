import { NormalizedRestTickerSnapshot } from "@core/data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";

export interface ScanFilter<TConfig = unknown> {
  name: string;
  description?: string;
  runFilter(data: NormalizedRestTickerSnapshot[], config: TConfig): NormalizedRestTickerSnapshot[];
}
