// Generic interface
export interface GenericTickerSorter<T, R> {
  sort(snapshots: T[]): R[];
}