/** Metrics port — counters & histograms */
export interface Metrics {
  inc(name: string, labels?: Record<string, any>): void;
  observe(name: string, value: number, labels?: Record<string, any>): void;
}
