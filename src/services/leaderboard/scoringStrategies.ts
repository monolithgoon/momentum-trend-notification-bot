import { KineticsCalculator } from "./__deprecated__KineticsCalculator";

export enum LeaderboardScoringStrategyKey {
	POP_UP_DECAY_MOMENTUM = "popUpDecayMomentum", // Combines multiple momentum components with pop-up boost and decay
	POP_UP_DECAY = "popUpDecay", // Basic pop-up and decay scoring based on velocity and acceleration
	WEIGHTED_LINEAR = "weightedLinear", // Weighted linear combination of pctChangeVelocity and pctChangeAcceleration
	MAGNITUDE = "magnitude", // Euclidean norm of velocity and acceleration (non-linear magnitude scoring)
	PERCENTAGE_CHANGE_ONLY = "percentageChangeOnly", // Uses only the raw price% change
	THRESHOLDED = "thresholded", // Ignores small-magnitude velocity/acceleration below threshold
	DOMAIN_INSPIRED = "domainInspired", // Domain-inspired log-adjusted score that incorporates volume
}

type ScoringParams = {
	changePct: number;
	volume: number;
	pctChangeVelocity: number;
	pctChangeAcceleration: number;
	volumeVelocity: number;
	volumeAcceleration: number;
	numConsecutiveAppearances: number; // Number of consecutive leaderboard appearances
	meanPCVelocity?: number;
	stdPCVelocity?: number;
	meanPCAcceleration?: number;
	stdPCAcceleration?: number;
};

export interface LeaderboardScoringStrategies{
	[key: string]: (params: ScoringParams, options?: any) => number;
}

/**
 * Provides multiple scoring strategies for leaderboard ranking.
 * Import the desired strategy and use as:
 *   const leaderboardScore = scoringStrategies.weightedLinear({ pctChangeVelocity, pctChangeAcceleration, change_pct__ld_tick, ... });
 */

export const scoringStrategies: LeaderboardScoringStrategies = {
	/**
	 * Pop-Up & Longevity Decay (broader momentum version)
	 * Calculates leaderboard_momentum_score as a weighted sum of price velocity/acceleration and volume velocity/acceleration,
	 * with pop-up bonus for new entries and longevity decay for repeated appearances.
	 * User can provide custom weightings for each term.
	 */
	popUpDecayMomentum: (
		{
			pctChangeVelocity,
			pctChangeAcceleration,
			volumeVelocity,
			volumeAcceleration,
			numConsecutiveAppearances,
		}: ScoringParams,
		{
			popBonus = 1.5,
			decayFactor = 0.95,
			pctVelWeight = 1,
			pctAccelWeight = 0.5,
			volVelWeight = 0.7,
			volAccelWeight = 0.3,
		}: {
			popBonus?: number;
			decayFactor?: number;
			pctVelWeight?: number;
			pctAccelWeight?: number;
			volVelWeight?: number;
			volAccelWeight?: number;
		} = {}
	): number => {
		let leaderboard_momentum_score =
			pctVelWeight * pctChangeVelocity +
			pctAccelWeight * pctChangeAcceleration +
			volVelWeight * volumeVelocity +
			volAccelWeight * volumeAcceleration;

		if (numConsecutiveAppearances === 1) leaderboard_momentum_score += popBonus;
		leaderboard_momentum_score *= Math.pow(decayFactor, numConsecutiveAppearances - 1);
		return leaderboard_momentum_score;
	},

	/**
	 * Pop-Up & Longevity Decay Strategy
	 * Boosts leaderboard_momentum_score for new entries, decays for long-standing entries
	 */
	popUpDecay: (
		{ pctChangeVelocity, pctChangeAcceleration, numConsecutiveAppearances }: ScoringParams,
		popBonus = 1.5,
		decayFactor = 0.95
	) => {
		let leaderboardMomentumScore = pctChangeVelocity + 0.5 * pctChangeAcceleration;
		if (numConsecutiveAppearances === 1) leaderboardMomentumScore += popBonus;
		leaderboardMomentumScore *= Math.pow(decayFactor, numConsecutiveAppearances - 1);
		return leaderboardMomentumScore;
	},

	/**
	 * Weighted Linear Combination
	 * leaderboard_momentum_score = velocity_weight * pctChangeVelocity + acceleration_weight * pctChangeAcceleration
	 */
	weightedLinear: (
		{ pctChangeVelocity, pctChangeAcceleration }: ScoringParams,
		velocityWeight = 0.7,
		accelerationWeight = 0.3
	) => velocityWeight * pctChangeVelocity + accelerationWeight * pctChangeAcceleration,

	/**
	 * Non-linear (Magnitude: Euclidean norm)
	 * leaderboard_momentum_score = sqrt(pctChangeVelocity^2 + pctChangeAcceleration^2)
	 */
	magnitude: ({ pctChangeVelocity, pctChangeAcceleration }: ScoringParams) =>
		Math.sqrt(pctChangeVelocity ** 2 + pctChangeAcceleration ** 2),

	/**
	 * Z-leaderboard_momentum_score Normalization
	 * leaderboard_momentum_score = normalized pctChangeVelocity + normalized pctChangeAcceleration
	 */

	// TODO ->
	// zNormalization: (
	// 	{ pctChangeVelocity, pctChangeAcceleration }: ScoringParams,
	// Used to calculate  z-scores for velocity and acceleration to find outliers relative to the population.
	// const meanPCVelocity = kinetics.computeMeanVelocity("pct_change_velocity__ld_tick");
	// const stdPCVelocity = kinetics.computeStdVelocity("pct_change_velocity__ld_tick");
	// const meanVolAccel = kinetics.computeMeanAcceleration("volume__ld_tick");
	// const stdVolAccel = kinetics.computeStdAcceleration("volume__ld_tick");

	// zScore: (
	// 	TICKER_HISTORY,
	// 	{
	// 		pctChangeVelocity,
	// 		pctChangeAcceleration,
	// 		meanPCVelocity = 0,
	// 		stdPCVelocity = 1,
	// 		meanPCAcceleration = 0,
	// 		stdPCAcceleration = 1,
	// 	}: ScoringParams
	// ) =>
	// 	(pctChangeVelocity - new KineticsCalculator(TICKER_HISTORY).computeMeanVelocity("pct_change_velocity__ld_tick")) /
	// 		(stdPCVelocity || 1) +
	// 	(pctChangeAcceleration -
	// 		new KineticsCalculator(TICKER_HISTORY).computeMeanAcceleration("pct_change_acceleration__ld_tick")) /
	// 		(stdPCAcceleration || 1),

	/**
	 * Change Only
	 * leaderboard_momentum_score = change_pct__ld_tick (default 0 if missing)
	 */
	percentageChangeOnly: ({ changePct = 0 }: ScoringParams) => changePct,

	/**
	 * Thresholded
	 * Ignores low-magnitude values for pctChangeVelocity/pctChangeAcceleration (default thresholds: 0.01)
	 * leaderboard_momentum_score = pctChangeVelocity (if above threshold) + pctChangeAcceleration (if above threshold)
	 */
	thresholded: (
		{ pctChangeVelocity, pctChangeAcceleration }: ScoringParams,
		velocityThreshold = 0.01,
		accelerationThreshold = 0.01
	) =>
		(Math.abs(pctChangeVelocity) > velocityThreshold ? pctChangeVelocity : 0) +
		(Math.abs(pctChangeAcceleration) > accelerationThreshold ? pctChangeAcceleration : 0),

	/**
	 * Domain-inspired (with optional volume)
	 * leaderboard_momentum_score = (pctChangeVelocity + pctChangeAcceleration) * log(1 + volume)
	 */
	domainInspired: ({ pctChangeVelocity, pctChangeAcceleration, volume = 1 }: ScoringParams) =>
		(pctChangeVelocity + pctChangeAcceleration) * Math.log(1 + volume),
};

export type LeaderboardScoringFnType = (params: ScoringParams) => number;
