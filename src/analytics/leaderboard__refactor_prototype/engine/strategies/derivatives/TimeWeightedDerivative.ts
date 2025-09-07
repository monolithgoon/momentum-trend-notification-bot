/** TimeWeightedDerivative — velocity/acceleration using timestamps */
import type { Snapshot } from "../../engine/types";
import type { DerivativeStrategy } from "./IndexBasedDerivative";
export class TimeWeightedDerivative implements DerivativeStrategy {
  velocity(series: Snapshot[], window: number): number {
    if (series.length < window) return 0;
    const tail = series.slice(-window);
    const x = tail.map(s => s.timestamp__ld_tick / 1000);
    const y = tail.map(s => s.pct_change__ld_tick);
    const n = x.length;
    const xm = x.reduce((a,b)=>a+b,0)/n;
    const ym = y.reduce((a,b)=>a+b,0)/n;
    let cov = 0, varx = 0;
    for (let i=0;i<n;i++){ const dx = x[i]-xm, dy = y[i]-ym; cov += dx*dy; varx += dx*dx; }
    return varx === 0 ? 0 : cov/varx;
  }
  acceleration(series: Snapshot[], window: number): number {
    if (series.length < window + 1) return 0;
    const vNow  = this.velocity(series.slice(-window), window);
    const vPrev = this.velocity(series.slice(-window-1, -1), window);
    return vNow - vPrev;
  }
}
