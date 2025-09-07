/** IndexBasedDerivative — velocity/acceleration on sample index */

import { Snapshot } from "../../types";

export interface DerivativeStrategy {
  velocity(series: Snapshot[], window: number): number;
  acceleration(series: Snapshot[], window: number): number;
}
export class IndexBasedDerivative implements DerivativeStrategy {
  velocity(series: Snapshot[], window: number): number {
    if (series.length < window) return 0;
    const y = series.slice(-window).map(s => s.pct_change__ld_tick);
    const x = [...Array(window).keys()];
    const xm = x.reduce((a,b)=>a+b,0)/window;
    const ym = y.reduce((a,b)=>a+b,0)/window;
    let cov = 0, varx = 0;
    for (let i=0;i<window;i++){ const dx = x[i]-xm, dy = y[i]-ym; cov += dx*dy; varx += dx*dx; }
    return varx === 0 ? 0 : cov/varx;
  }
  acceleration(series: Snapshot[], window: number): number {
    if (series.length < window + 1) return 0;
    const vNow  = this.velocity(series.slice(-window), window);
    const vPrev = this.velocity(series.slice(-window-1, -1), window);
    return vNow - vPrev;
  }
}
