import { bootstrapApp } from "./main";

// ---- main.ts (entry point) ----
// Start the bootstrap process
bootstrapApp();

function climbStairs(n: number): number {
	const memo: Record<number, number> = {};

	function dp(step: number) {
		// base cases
		if (step == 0) return 1; // 1 way to stay on the ground
		if (step == 1) return 1; // 1 way to reach the first step
		if (step < 0) return 0; // No way to reach negative steps

		// Check if already computed
		if (memo[step] !== undefined) return memo[step];

		// Compute and memoize
		memo[step] = dp(step - 1) + dp(step - 2);
		return memo[step];
	}

	return dp(n);
}

/**
 * Market Movers Scan
- Compare snapshots to detect tickers moving up, or just added and rising

- Maintain an internal leaderboard, and have an anomaly detection algorithm for new tickers that appear on the leaderboard

WS
- Monitor anomalies to check if they're trending above KC

All this work just to keep track of a leaderboard, and detect stocks that pop up on the leaderboard and quickly move up??? That's wild!!!
 */
