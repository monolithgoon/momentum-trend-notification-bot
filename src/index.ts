import { APP_CONFIG } from "@config/index";
import { verifyRedisConnection } from "@infrastructure/redis/redis.service";
import { initializeAlertListeners } from "@app/bootstrap/__deprecated__alertListeners";
import startAppDaemon_2 from "./app/daemon";
import gracefulDaemonShutdown from "./app/daemonShutdownHandler";
import { registerAllListeners } from "./listeners/registerListeners";

// ---- main.ts (entry point) ----

(async () => {
	try {
		console.log("🚀 Bootstrapping app...");

		// REMOVE - DEPRECATD
		// Step 1: Verify Redis (fail fast if down)
		// await verifyRedisConnection();
		
		// Step 2: Initialize listeners/subscriptions
		registerAllListeners(); // ⬅️ bind global listeners once
		// REMOVE - DEPRECATD
		// await initializeAlertListeners();

		// Step 3: Defer daemon startup — don't block on flaky network
		setTimeout(() => {
			startAppDaemon_2(APP_CONFIG.APP_DAEMON_SAFE_RUN_INTERVAL_MS);
		}, 0); // async kickoff, non-blocking

		console.log("✅ App fully initialized.");
	} catch (err) {
		console.error("❌ App failed to initialize:", err);
		await gracefulDaemonShutdown(`Too many app daemon failures`);
	}
})();

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
