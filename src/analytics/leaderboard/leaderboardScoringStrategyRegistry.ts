export type ScoringParams = {
  changePct: number;
  volume: number;
  pctChangeVelocity: number;
  pctChangeAcceleration: number;
  volumeVelocity: number;
  volumeAcceleration: number;
  numConsecutiveAppearances: number;
  meanPCVelocity?: number;
  stdPCVelocity?: number;
  meanPCAcceleration?: number;
  stdPCAcceleration?: number;
};

export interface LeaderboardScoringStrategy {
  compute(params: ScoringParams): number;
}

class PopUpDecayMomentumStrategy implements LeaderboardScoringStrategy {
  constructor(
    private readonly weights = {
      popBonus: 1.5,
      decayFactor: 0.95,
      pctVelWeight: 1,
      pctAccelWeight: 0.5,
      volVelWeight: 0.7,
      volAccelWeight: 0.3,
    }
  ) {}

  compute({
    pctChangeVelocity,
    pctChangeAcceleration,
    volumeVelocity,
    volumeAcceleration,
    numConsecutiveAppearances,
  }: ScoringParams): number {
    const w = this.weights;
    let score =
      w.pctVelWeight * pctChangeVelocity +
      w.pctAccelWeight * pctChangeAcceleration +
      w.volVelWeight * volumeVelocity +
      w.volAccelWeight * volumeAcceleration;

    if (numConsecutiveAppearances === 1) score += w.popBonus;
    return score * Math.pow(w.decayFactor, numConsecutiveAppearances - 1);
  }
}

class PercentageChangeOnlyStrategy implements LeaderboardScoringStrategy {
  compute({ changePct }: ScoringParams): number {
    return changePct ?? 0;
  }
}

class WeightedLinearStrategy implements LeaderboardScoringStrategy {
  constructor(private readonly weights = { vel: 0.7, accel: 0.3 }) {}

  compute({ pctChangeVelocity, pctChangeAcceleration }: ScoringParams): number {
    return this.weights.vel * pctChangeVelocity + this.weights.accel * pctChangeAcceleration;
  }
}

// class PopUpDecayStrategy implements LeaderboardScoringStrategy {
//   compute({ pctChangeVelocity, pctChangeAcceleration, numConsecutiveAppearances }: ScoringParams): number {
//     let score = pctChangeVelocity + 0.5 * pctChangeAcceleration;
//     if (numConsecutiveAppearances === 1) score += 1.5;
//     return score * Math.pow(0.95, numConsecutiveAppearances - 1);
//   }
// }

// class MagnitudeStrategy implements LeaderboardScoringStrategy {
//   compute({ pctChangeVelocity, pctChangeAcceleration }: ScoringParams): number {
//     return Math.sqrt(pctChangeVelocity ** 2 + pctChangeAcceleration ** 2);
//   }
// }

// class ThresholdedStrategy implements LeaderboardScoringStrategy {
//   compute({ pctChangeVelocity, pctChangeAcceleration }: ScoringParams): number {
//     const velocityThreshold = 0.01;
//     const accelerationThreshold = 0.01;
//     return (
//       (Math.abs(pctChangeVelocity) > velocityThreshold ? pctChangeVelocity : 0) +
//       (Math.abs(pctChangeAcceleration) > accelerationThreshold ? pctChangeAcceleration : 0)
//     );
//   }
// }

// class DomainInspiredStrategy implements LeaderboardScoringStrategy {
//   compute({ pctChangeVelocity, pctChangeAcceleration, volume }: ScoringParams): number {
//     return (pctChangeVelocity + pctChangeAcceleration) * Math.log(1 + (volume || 1));
//   }
// }

export const ScoringStrategyRegistry: Record<string, LeaderboardScoringStrategy> = {
  popUpDecayMomentum: new PopUpDecayMomentumStrategy(),
  percentageChangeOnly: new PercentageChangeOnlyStrategy(),
  weightedLinear: new WeightedLinearStrategy(),
  // popUpDecay: new PopUpDecayStrategy(),
  // magnitude: new MagnitudeStrategy(),
  // thresholded: new ThresholdedStrategy(),
  // domainInspired: new DomainInspiredStrategy(),
};
