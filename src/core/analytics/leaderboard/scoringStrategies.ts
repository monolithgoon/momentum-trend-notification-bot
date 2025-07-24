/**
 * Provides multiple scoring strategies for leaderboard ranking.
 * Import the desired strategy and use as:
 *   const leaderboardScore = scoringStrategies.weightedLinear({ pctChangeVelocity, pctChangeAcceleration, ld_change_pct, ... });
 */

type scoringParams = {
	changePct: number;
	volume: number;
	pctChangeVelocity: number;
	pctChangeAcceleration: number;
	volumeVelocity: number;
	volumeAcceleration: number;
	numConsecutiveAppearances: number; // Number of consecutive leaderboard appearances
	meanVelocity?: number;
	stdVelocity?: number;
	meanAcceleration?: number;
	stdAcceleration?: number;
};

export const scoringStrategies = {
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
		}: scoringParams,
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
	) => {
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
		{ pctChangeVelocity, pctChangeAcceleration, numConsecutiveAppearances }: scoringParams,
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
		{ pctChangeVelocity, pctChangeAcceleration }: scoringParams,
		velocityWeight = 0.7,
		accelerationWeight = 0.3
	) => velocityWeight * pctChangeVelocity + accelerationWeight * pctChangeAcceleration,

	/**
	 * Non-linear (Magnitude: Euclidean norm)
	 * leaderboard_momentum_score = sqrt(pctChangeVelocity^2 + pctChangeAcceleration^2)
	 */
	magnitude: ({ pctChangeVelocity, pctChangeAcceleration }: scoringParams) =>
		Math.sqrt(pctChangeVelocity ** 2 + pctChangeAcceleration ** 2),

	/**
	 * Z-leaderboard_momentum_score Normalization
	 * leaderboard_momentum_score = normalized pctChangeVelocity + normalized pctChangeAcceleration
	 */
	zScore: ({
		pctChangeVelocity,
		pctChangeAcceleration,
		mean_velocity = 0,
		std_velocity = 1,
		mean_acceleration = 0,
		std_acceleration = 1,
	}: scoringParams) =>
		(pctChangeVelocity - mean_velocity) / (std_velocity || 1) +
		(pctChangeAcceleration - mean_acceleration) / (std_acceleration || 1),

	/**
	 * Change Only
	 * leaderboard_momentum_score = ld_change_pct (default 0 if missing)
	 */
	percentageChangeOnly: ({ changePct = 0 }: scoringParams) => changePct,

	/**
	 * Thresholded
	 * Ignores low-magnitude values for pctChangeVelocity/pctChangeAcceleration (default thresholds: 0.01)
	 * leaderboard_momentum_score = pctChangeVelocity (if above threshold) + pctChangeAcceleration (if above threshold)
	 */
	thresholded: (
		{ pctChangeVelocity, pctChangeAcceleration }: scoringParams,
		velocityThreshold = 0.01,
		accelerationThreshold = 0.01
	) =>
		(Math.abs(pctChangeVelocity) > velocityThreshold ? pctChangeVelocity : 0) +
		(Math.abs(pctChangeAcceleration) > accelerationThreshold ? pctChangeAcceleration : 0),

	/**
	 * Domain-inspired (with optional volume)
	 * leaderboard_momentum_score = (pctChangeVelocity + pctChangeAcceleration) * log(1 + volume)
	 */
	domainInspired: ({ pctChangeVelocity, pctChangeAcceleration, volume = 1 }: scoringParams) =>
		(pctChangeVelocity + pctChangeAcceleration) * Math.log(1 + volume),
};

export type leaderboardScoringFnType = (params: scoringParams) => number;
