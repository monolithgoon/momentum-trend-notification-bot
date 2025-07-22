/**
 * Provides multiple scoring strategies for leaderboard ranking.
 * Import the desired strategy and use as:
 *   const leaderboardScore = scoringStrategies.weightedLinear({ velocity, acceleration, change_pct, ... });
 */

type scoringParams = {
	velocity: number;
	acceleration: number;
	change_pct?: number;
	mean_velocity?: number;
	std_velocity?: number;
	mean_acceleration?: number;
	std_acceleration?: number;
	volume?: number;
	consecutiveAppearances: number; // Number of consecutive leaderboard appearances
};

export const scoringStrategies = {
	/**
	 * Pop-Up & Longevity Decay Strategy
	 * Boosts score for new entries, decays for long-standing entries
	 */
	popUpDecay: (
		{ velocity, acceleration, consecutiveAppearances }: scoringParams,
		popBonus = 1.5,
		decayFactor = 0.95
	) => {
		let score = velocity + 0.5 * acceleration;
		if (consecutiveAppearances === 1) score += popBonus;
		score *= Math.pow(decayFactor, consecutiveAppearances - 1);
		return score;
	},

	/**
	 * Weighted Linear Combination
	 * score = velocity_weight * velocity + acceleration_weight * acceleration
	 */
	weightedLinear: ({ velocity, acceleration }: scoringParams, velocityWeight = 0.7, accelerationWeight = 0.3) =>
		velocityWeight * velocity + accelerationWeight * acceleration,

	/**
	 * Non-linear (Magnitude: Euclidean norm)
	 * score = sqrt(velocity^2 + acceleration^2)
	 */
	magnitude: ({ velocity, acceleration }: scoringParams) => Math.sqrt(velocity ** 2 + acceleration ** 2),

	/**
	 * Z-score Normalization
	 * score = normalized velocity + normalized acceleration
	 */
	zScore: ({
		velocity,
		acceleration,
		mean_velocity = 0,
		std_velocity = 1,
		mean_acceleration = 0,
		std_acceleration = 1,
	}: scoringParams) =>
		(velocity - mean_velocity) / (std_velocity || 1) + (acceleration - mean_acceleration) / (std_acceleration || 1),

	/**
	 * Change Only
	 * score = change_pct (default 0 if missing)
	 */
	changeOnly: ({ change_pct = 0 }: scoringParams) => change_pct,

	/**
	 * Thresholded
	 * Ignores low-magnitude values for velocity/acceleration (default thresholds: 0.01)
	 * score = velocity (if above threshold) + acceleration (if above threshold)
	 */
	thresholded: ({ velocity, acceleration }: scoringParams, velocityThreshold = 0.01, accelerationThreshold = 0.01) =>
		(Math.abs(velocity) > velocityThreshold ? velocity : 0) +
		(Math.abs(acceleration) > accelerationThreshold ? acceleration : 0),

	/**
	 * Domain-inspired (with optional volume)
	 * score = (velocity + acceleration) * log(1 + volume)
	 */
	domainInspired: ({ velocity, acceleration, volume = 1 }: scoringParams) =>
		(velocity + acceleration) * Math.log(1 + volume),
};

export type leaderboardScoringFnType = (params: scoringParams) => number;
