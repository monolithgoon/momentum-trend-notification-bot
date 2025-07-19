import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";

export interface KineticsCalculators {
  computeVelocity(history: NormalizedRestTickerSnapshot[]): number;
  computeAcceleration(history: NormalizedRestTickerSnapshot[]): number;
}

export class LeaderboardKineticsCalculator implements KineticsCalculators {
  computeVelocity(history: NormalizedRestTickerSnapshot[]): number {
    if (history.length < 2) return 0;
    const [latest, prev] = history;

    const deltaPct = latest.change_pct - prev.change_pct;
    const deltaTime = (latest.timestamp - prev.timestamp) / 1000;
    return deltaTime > 0 ? deltaPct / deltaTime : 0;
  }

  computeAcceleration(history: NormalizedRestTickerSnapshot[]): number {
    if (history.length < 3) return 0;
    const [s3, s2, s1] = history;

    const dt1 = (s2.timestamp - s1.timestamp) / 1000;
    const dt2 = (s3.timestamp - s2.timestamp) / 1000;

    if (dt1 <= 0 || dt2 <= 0) return 0;

    const v1 = (s2.change_pct - s1.change_pct) / dt1;
    const v2 = (s3.change_pct - s2.change_pct) / dt2;

    return (v2 - v1) / dt2;
  }
}
