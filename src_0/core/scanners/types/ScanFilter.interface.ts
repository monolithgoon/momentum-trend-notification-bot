import { NormalizedRestTickerSnapshot } from "@core/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";

export interface ScanFilter<TConfig = unknown> {
  name: string;
  description?: string;
  runFilter(data: NormalizedRestTickerSnapshot[], config: TConfig): NormalizedRestTickerSnapshot[];
}
