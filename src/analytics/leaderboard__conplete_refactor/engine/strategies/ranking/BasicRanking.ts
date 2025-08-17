/** BasicRanking — z-score blend of kinetics */
import type { Enriched } from "../../engine/types";
export interface RankingStrategy { rank(items: Enriched[]): Enriched[]; }
export class BasicRanking implements RankingStrategy {
  rank(items: Enriched[]): Enriched[] {
    if (!items.length) return items;
    const fields: (keyof Enriched)[] = [
      "pct_change_velocity__ld_tick",
      "pct_change_acceleration__ld_tick",
      "volume_velocity__ld_tick",
      "volume_acceleration__ld_tick",
    ];
    const stats: Record<string,{mu:number,sd:number}> = {};
    for (const f of fields) {
      const vals = items.map(it => Number(it[f] ?? 0));
      const mu = vals.reduce((a,b)=>a+b,0) / vals.length;
      const sd = Math.sqrt(vals.reduce((a,b)=>a+(b-mu)*(b-mu),0) / Math.max(1, vals.length-1)) || 1;
      stats[f as string] = { mu, sd };
    }
    const scored = items.map(it => {
      const z = (f: keyof Enriched) => (Number(it[f] ?? 0) - stats[f as string].mu) / stats[f as string].sd;
      const score =
        1.00 * z("pct_change_velocity__ld_tick") +
        0.50 * z("pct_change_acceleration__ld_tick") +
        0.50 * z("volume_velocity__ld_tick") +
        0.25 * z("volume_acceleration__ld_tick");
      return { ...it, score__ld_tick: score };
    });
    scored.sort((a,b)=> (b.score__ld_tick! - a.score__ld_tick!));
    scored.forEach((it, idx)=> it.rank__ld_tick = idx + 1);
    return scored;
  }
}
