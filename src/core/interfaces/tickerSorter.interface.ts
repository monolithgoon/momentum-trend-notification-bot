// Generic interface
export interface TickerSorter<T, R> {
  sort(snapshots: T[]): R[];
}