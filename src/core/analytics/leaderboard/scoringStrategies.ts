/**
 * Provides multiple scoring strategies for leaderboard ranking.
 * Import the desired strategy and use as:
 *   const leaderboardScore = scoringStrategies.weightedLinear({ perc_change_velocity, perc_change_acceleration, change_pct, ... });
 */

type scoringParams = {
	perc_change_velocity: number;
	perc_change_acceleration: number;
	change_pct?: number;
	mean_velocity?: number;
	std_velocity?: number;
	mean_acceleration?: number;
	std_acceleration?: number;
	volume?: number;
	num_consecutive_appearances: number; // Number of consecutive leaderboard appearances
};

export const scoringStrategies = {
	/**
	 * Pop-Up & Longevity Decay Strategy
	 * Boosts leaderboard_momentum_score for new entries, decays for long-standing entries
	 */
	popUpDecay: (
		{ perc_change_velocity, perc_change_acceleration, num_consecutive_appearances }: scoringParams,
		popBonus = 1.5,
		decayFactor = 0.95
	) => {
		let leaderboard_momentum_score = perc_change_velocity + 0.5 * perc_change_acceleration;
		if (num_consecutive_appearances === 1) leaderboard_momentum_score += popBonus;
		leaderboard_momentum_score *= Math.pow(decayFactor, num_consecutive_appearances - 1);
		return leaderboard_momentum_score;
	},

	/**
	 * Weighted Linear Combination
	 * leaderboard_momentum_score = velocity_weight * perc_change_velocity + acceleration_weight * perc_change_acceleration
	 */
	weightedLinear: ({ perc_change_velocity, perc_change_acceleration }: scoringParams, velocityWeight = 0.7, accelerationWeight = 0.3) =>
		velocityWeight * perc_change_velocity + accelerationWeight * perc_change_acceleration,

	/**
	 * Non-linear (Magnitude: Euclidean norm)
	 * leaderboard_momentum_score = sqrt(perc_change_velocity^2 + perc_change_acceleration^2)
	 */
	magnitude: ({ perc_change_velocity, perc_change_acceleration }: scoringParams) => Math.sqrt(perc_change_velocity ** 2 + perc_change_acceleration ** 2),

	/**
	 * Z-leaderboard_momentum_score Normalization
	 * leaderboard_momentum_score = normalized perc_change_velocity + normalized perc_change_acceleration
	 */
	zScore: ({
		perc_change_velocity,
		perc_change_acceleration,
		mean_velocity = 0,
		std_velocity = 1,
		mean_acceleration = 0,
		std_acceleration = 1,
	}: scoringParams) =>
		(perc_change_velocity - mean_velocity) / (std_velocity || 1) + (perc_change_acceleration - mean_acceleration) / (std_acceleration || 1),

	/**
	 * Change Only
	 * leaderboard_momentum_score = change_pct (default 0 if missing)
	 */
	percentageChangeOnly: ({ change_pct = 0 }: scoringParams) => change_pct,

	/**
	 * Thresholded
	 * Ignores low-magnitude values for perc_change_velocity/perc_change_acceleration (default thresholds: 0.01)
	 * leaderboard_momentum_score = perc_change_velocity (if above threshold) + perc_change_acceleration (if above threshold)
	 */
	thresholded: ({ perc_change_velocity, perc_change_acceleration }: scoringParams, velocityThreshold = 0.01, accelerationThreshold = 0.01) =>
		(Math.abs(perc_change_velocity) > velocityThreshold ? perc_change_velocity : 0) +
		(Math.abs(perc_change_acceleration) > accelerationThreshold ? perc_change_acceleration : 0),

	/**
	 * Domain-inspired (with optional volume)
	 * leaderboard_momentum_score = (perc_change_velocity + perc_change_acceleration) * log(1 + volume)
	 */
	domainInspired: ({ perc_change_velocity, perc_change_acceleration, volume = 1 }: scoringParams) =>
		(perc_change_velocity + perc_change_acceleration) * Math.log(1 + volume),
};

export type leaderboardScoringFnType = (params: scoringParams) => number;
