import { NormalizedRestTickerSnapshot } from "@core/models/NormalizedRestTickerSnapshot.interface";

export interface ScanFilter<TConfig = unknown> {
  name: string;
  description?: string;
  runFilter(data: NormalizedRestTickerSnapshot[], config: TConfig): NormalizedRestTickerSnapshot[];
}
